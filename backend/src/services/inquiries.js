import { randomUUID } from 'node:crypto';
import { services } from './context.js';
import { env, isConfigured } from '../config/env.js';
import { draftReply, draftIsSendable } from './ai.js';
import { getKnowledge } from './knowledge.js';
import { buildOwnerNotification, buildVisitorReply, MailError, sendViaResend } from './mailer.js';
import { toMillis } from '../utils/serialize.js';
import { HttpError } from '../utils/errors.js';

/**
 * Contact inquiry pipeline:  save → AI draft → visitor auto-reply → owner notification.
 *
 * Safety properties
 * - Each step has its own status, so a retry only redoes what failed.
 * - A Firestore lease (lockedUntil) stops two workers processing the same inquiry.
 * - Every email carries a Resend Idempotency-Key (visitor-<id>, owner-<id>), so even a
 *   retry after an ambiguous failure cannot send a duplicate within Resend's 24 h window.
 * - Transient failures are retried with backoff up to MAX_ATTEMPTS; permanent ones (4xx) are not.
 */
const COLLECTION = 'messages';
const MAX_ATTEMPTS = 4;
const LEASE_MS = 2 * 60 * 1000;
const RETRY_WINDOW_MS = 20 * 60 * 60 * 1000; // stay inside Resend's 24 h idempotency window
const IP_LIMIT_PER_HOUR = 5;
const EMAIL_LIMIT_PER_HOUR = 3;

const col = () => services.db().collection(COLLECTION);
const now = () => new Date();
const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

/** Firestore-backed limits work across all Cloud Function instances (in-memory limits don't). */
async function enforceDurableLimits({ ipHash, email }) {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const [byIp, byEmail] = await Promise.all([
    col().where('ipHash', '==', ipHash).get(),
    col().where('email', '==', email).get(),
  ]);
  const recent = (snap) => snap.docs.filter((d) => toMillis(d.data().createdAt) > hourAgo).length;
  if (recent(byIp) >= IP_LIMIT_PER_HOUR || recent(byEmail) >= EMAIL_LIMIT_PER_HOUR) {
    throw new HttpError(429, 'Too many messages recently. Please try again in an hour, or email directly.', 'RATE_LIMITED');
  }
}

export async function createInquiry(input, { spam, ipHash, userAgent }) {
  await enforceDurableLimits({ ipHash, email: input.email });
  const created = now();
  const doc = {
    conversationId: randomUUID(),
    name: input.name,
    email: input.email,
    subject: input.subject,
    message: input.message,
    projectType: input.projectType || '',
    status: spam ? 'spam' : 'new',
    spam: Boolean(spam),
    starred: false,
    ipHash,
    userAgent,
    createdAt: created,
    updatedAt: created,
    ai: { status: 'pending' },
    delivery: { visitor: { status: 'pending', attempts: 0 }, owner: { status: 'pending', attempts: 0 } },
    pipelineState: 'queued',
    attempts: 0,
    lockedUntil: null,
    nextAttemptAt: null,
    errors: [],
  };
  const ref = await col().add(doc);
  return { id: ref.id, conversationId: doc.conversationId };
}

/* ------------------------------------------------------------------ */
/* Process                                                             */
/* ------------------------------------------------------------------ */

async function claim(ref, { force }) {
  return services.db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const d = snap.data();
    if (d.pipelineState === 'done' && !force) return null;
    if (d.lockedUntil && toMillis(d.lockedUntil) > Date.now()) return null; // someone else is on it
    if (!force && d.attempts >= MAX_ATTEMPTS) return null;
    const patch = { pipelineState: 'running', lockedUntil: new Date(Date.now() + LEASE_MS), attempts: (d.attempts || 0) + 1, updatedAt: now() };
    tx.update(ref, patch);
    return { ...d, ...patch, id: snap.id };
  });
}

const logError = (inq, stage, err) => {
  inq.errors = [...(inq.errors || []), { at: now(), stage, message: String(err?.message || err).slice(0, 500), code: err?.status || err?.code || null }].slice(-20);
};

async function autoReplyBlockReason(inq) {
  if (inq.spam) return 'Flagged as spam';
  if (!isConfigured.mail()) return 'RESEND_API_KEY not configured';
  if (!isConfigured.visitorEmail()) {
    return env.autoReply.enabled ? 'No verified Resend sending domain (RESEND_FROM uses resend.dev)' : 'Auto-replies are switched off (AUTO_REPLY_ENABLED=false)';
  }
  if (inq.email.toLowerCase() === env.mail.notifyTo.toLowerCase()) return 'Sender is the site owner';

  // Anti-abuse: one auto-reply per recipient per window, and a global daily cap.
  const windowStart = Date.now() - env.autoReply.perRecipientHours * 3600 * 1000;
  const sameRecipient = await col().where('email', '==', inq.email).get();
  if (sameRecipient.docs.some((d) => d.id !== inq.id && d.data().delivery?.visitor?.status === 'sent' && toMillis(d.data().delivery.visitor.sentAt) > windowStart)) {
    return `Already auto-replied to this address in the last ${env.autoReply.perRecipientHours} h`;
  }
  const today = await col().where('autoReplyDay', '==', dayKey()).get();
  if (today.size >= env.autoReply.dailyLimit) return `Daily auto-reply limit (${env.autoReply.dailyLimit}) reached`;
  return null;
}

async function sendStep(inq, which, build) {
  const step = inq.delivery[which];
  if (step.status === 'sent' || step.status === 'skipped' || step.permanent) return;
  try {
    const email = build();
    const id = await sendViaResend({ ...email, idempotencyKey: `${which}-${inq.id}` });
    inq.delivery[which] = { ...step, status: 'sent', resendId: id, sentAt: now(), attempts: (step.attempts || 0) + 1, lastError: null };
  } catch (err) {
    const permanent = err instanceof MailError && err.permanent;
    inq.delivery[which] = { ...step, status: 'failed', attempts: (step.attempts || 0) + 1, lastError: String(err.message).slice(0, 300), permanent };
    logError(inq, `email.${which}`, err);
  }
}

/**
 * Runs the pipeline for one inquiry. Safe to call repeatedly (HTTP handler,
 * Firestore trigger, scheduled retry, admin "Retry" button).
 */
export async function processInquiry(id, { force = false } = {}) {
  const ref = col().doc(id);
  const claimed = await claim(ref, { force });
  if (!claimed) return { skipped: true };
  const inq = structuredClone({ ...claimed, delivery: claimed.delivery || {}, ai: claimed.ai || { status: 'pending' } });
  inq.delivery.visitor ||= { status: 'pending', attempts: 0 };
  inq.delivery.owner ||= { status: 'pending', attempts: 0 };

  // 1. AI draft
  let knowledge = null;
  if (inq.ai.status === 'pending' || inq.ai.status === 'failed') {
    if (inq.spam) {
      inq.ai = { status: 'skipped', error: 'Flagged as spam' };
    } else {
      try {
        knowledge = await getKnowledge();
        const result = await draftReply(inq, knowledge);
        inq.ai = { ...result, generatedAt: now() };
      } catch (err) {
        inq.ai = { status: 'failed', error: String(err.message).slice(0, 300), attempts: (inq.ai.attempts || 0) + 1 };
        logError(inq, 'ai', err);
      }
    }
  }
  // A transient AI failure is retried before any email goes out, unless we've run out of attempts.
  const aiRetryable = inq.ai.status === 'failed' && inq.attempts < MAX_ATTEMPTS;

  // 2. Visitor auto-reply
  if (!aiRetryable && inq.delivery.visitor.status === 'pending') {
    const reason = await autoReplyBlockReason(inq);
    if (reason) inq.delivery.visitor = { ...inq.delivery.visitor, status: 'skipped', reason };
  }
  if (!aiRetryable && (inq.delivery.visitor.status === 'pending' || inq.delivery.visitor.status === 'failed')) {
    knowledge ||= await getKnowledge().catch(() => null);
    const ownerName = knowledge?.ownerName || env.autoReply.ownerName;
    const ownerEmail = env.mail.notifyTo;
    const useAi = draftIsSendable(inq.ai);
    await sendStep(inq, 'visitor', () => buildVisitorReply(inq, { body: useAi ? inq.ai.reply : null, ownerName, ownerEmail }));
    if (inq.delivery.visitor.status === 'sent') {
      inq.delivery.visitor.content = useAi ? 'ai' : 'template';
      inq.autoReplyDay = dayKey();
    }
  }

  // 3. Owner notification (after the visitor step so it can report what the visitor received)
  if (inq.spam && inq.delivery.owner.status === 'pending') {
    inq.delivery.owner = { ...inq.delivery.owner, status: 'skipped', reason: 'Flagged as spam - visible in the admin inbox' };
  }
  if (!aiRetryable && !isConfigured.mail() && inq.delivery.owner.status === 'pending') {
    inq.delivery.owner = { ...inq.delivery.owner, status: 'skipped', reason: 'RESEND_API_KEY not configured' };
  }
  if (!aiRetryable) await sendStep(inq, 'owner', () => buildOwnerNotification(inq));

  // 4. Decide whether a retry is needed
  const retryable = (s) => s.status === 'failed' && !s.permanent;
  const needsRetry = aiRetryable || retryable(inq.delivery.visitor) || retryable(inq.delivery.owner);
  const canRetry = needsRetry && inq.attempts < MAX_ATTEMPTS && Date.now() - toMillis(inq.createdAt) < RETRY_WINDOW_MS;
  const backoffMin = 2 ** inq.attempts; // 2, 4, 8 minutes
  const patch = {
    ai: inq.ai,
    delivery: inq.delivery,
    errors: inq.errors,
    pipelineState: canRetry ? 'retry' : 'done',
    nextAttemptAt: canRetry ? new Date(Date.now() + backoffMin * 60 * 1000) : null,
    lockedUntil: null,
    updatedAt: now(),
    ...(inq.autoReplyDay ? { autoReplyDay: inq.autoReplyDay } : {}),
  };
  await ref.update(patch);
  return { ...inq, ...patch };
}

/** Called by the scheduled function (and usable manually): retries due inquiries. */
export async function retryDueInquiries({ limit = 20 } = {}) {
  const snap = await col().where('pipelineState', '==', 'retry').get();
  const due = snap.docs.filter((d) => toMillis(d.data().nextAttemptAt) <= Date.now()).slice(0, limit);
  const results = [];
  for (const d of due) results.push(await processInquiry(d.id).catch((err) => ({ error: err.message })));
  return { checked: snap.size, processed: results.length };
}

/** Admin "Retry" button: reset failed steps (never re-send successful ones) and run now. */
export async function retryInquiryNow(id) {
  const ref = col().doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const d = snap.data();
  const reset = (s = {}) => (s.status === 'failed' ? { ...s, status: 'pending', permanent: false } : s);
  await ref.update({
    ai: d.ai?.status === 'failed' ? { ...d.ai, status: 'pending' } : d.ai,
    delivery: { visitor: reset(d.delivery?.visitor), owner: reset(d.delivery?.owner) },
    pipelineState: 'queued',
    attempts: 0,
    lockedUntil: null,
    updatedAt: now(),
  });
  return processInquiry(id, { force: true });
}
