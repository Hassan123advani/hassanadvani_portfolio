import { env, isConfigured } from '../config/env.js';
import { escapeHtml } from '../utils/text.js';

/**
 * Email via the Resend HTTP API. RESEND_API_KEY is read only on the server
 * (backend/.env locally, Firebase Secret Manager in Cloud Functions) and is
 * never logged or returned to clients.
 */
const RESEND_URL = 'https://api.resend.com/emails';

export const mailEnabled = () => isConfigured.mail();

export class MailError extends Error {
  constructor(message, { status, name } = {}) {
    super(message);
    this.status = status;
    this.resendError = name;
  }
  /** 4xx (except 429) won't succeed on retry: bad address, unverified domain, invalid key... */
  get permanent() {
    return Boolean(this.status && this.status >= 400 && this.status < 500 && this.status !== 429);
  }
}

/** Low-level send. Returns the Resend email id. Idempotency keys make retries safe (24 h window). */
export async function sendViaResend({ to, subject, html, text, replyTo, idempotencyKey, headers, from }, { fetchImpl = fetch } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetchImpl(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.mail.resendApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'portfolio-backend',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: from || env.mail.from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(headers ? { headers } : {}),
      }),
      signal: ctrl.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Resend error bodies contain a message and name, never the key.
      throw new MailError(body?.message || `Resend responded with ${res.status}`, { status: res.status, name: body?.name });
    }
    return body.id;
  } catch (err) {
    if (err.name === 'AbortError') throw new MailError('Resend request timed out');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Header-safe single line (prevents line breaks sneaking into the subject). */
const oneLine = (s = '') => String(s).replace(/[\r\n]+/g, ' ').trim();

export const formatKarachiTime = (d) =>
  `${new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Karachi' }).format(new Date(d))} (PKT)`;

const shell = (kicker, inner) => `<!doctype html><html><body style="margin:0;background:#f4f2ec;font-family:Segoe UI,Arial,sans-serif;color:#15160f">
<div style="max-width:620px;margin:0 auto;padding:28px 18px">
<div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#5d6150;margin-bottom:12px">${kicker}</div>
<div style="background:#fff;border:1px solid #e3e0d5;border-radius:14px;padding:26px">${inner}</div></div></body></html>`;

const block = (title, body, tint = '#fafaf7') =>
  `<h2 style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#5d6150;margin:22px 0 8px">${title}</h2>
<div style="white-space:pre-wrap;font-size:15px;line-height:1.6;background:${tint};border:1px solid #eee;border-radius:10px;padding:14px">${body}</div>`;

const VISITOR_LABEL = {
  sent: 'Sent to the visitor automatically',
  skipped: 'Not sent to the visitor',
  failed: 'Sending to the visitor FAILED',
  pending: 'Pending',
};

/** Notification to Hassan: visitor details, original message, AI response, submission time. */
export function buildOwnerNotification(inq) {
  const ai = inq.ai || {};
  const visitor = inq.delivery?.visitor || {};
  const rows = [
    ['Name', inq.name],
    ['Email', inq.email],
    ['Subject', inq.subject],
    ['Project type', inq.projectType || '—'],
    ['Submitted', formatKarachiTime(inq.createdAt)],
    ['Conversation ID', inq.conversationId || inq.id || '—'],
  ]
    .map(([k, v]) => `<tr><td style="padding:5px 14px 5px 0;color:#5d6150;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:5px 0">${escapeHtml(v)}</td></tr>`)
    .join('');

  const aiText =
    ai.status === 'done' && ai.reply
      ? ai.reply
      : ai.status === 'failed'
        ? `AI could not generate a reply: ${ai.error || 'unknown error'}`
        : `AI reply not generated (${ai.error || ai.status || 'disabled'}).`;
  const aiMeta = [
    ai.decision && `Decision: ${ai.decision === 'answer' ? 'fully answered' : 'needs your personal reply'}`,
    ai.category && `Category: ${ai.category}`,
    ai.reason && `Note: ${ai.reason}`,
    ai.problems?.length ? `Safety check: ${ai.problems.join('; ')}` : '',
    `Visitor email: ${VISITOR_LABEL[visitor.status] || visitor.status || 'pending'}${visitor.reason ? ` — ${visitor.reason}` : ''}`,
  ]
    .filter(Boolean)
    .join('\n');

  const needsYou = ai.decision !== 'answer' || visitor.status !== 'sent';
  const html = shell(
    'Portfolio · new contact message',
    `<h1 style="margin:0 0 6px;font-size:20px">${escapeHtml(inq.subject)}</h1>
<p style="margin:0 0 14px;font-size:13px;color:${needsYou ? '#a85a08' : '#1d7f47'}">${needsYou ? 'Needs your attention' : 'Answered automatically'}</p>
<table style="border-collapse:collapse;font-size:14px">${rows}</table>
${block('Original message', escapeHtml(inq.message))}
${block('AI-generated response', escapeHtml(aiText), '#f6fbe9')}
<p style="white-space:pre-wrap;font-size:12px;color:#5d6150;margin:10px 0 0">${escapeHtml(aiMeta)}</p>
<p style="font-size:12px;color:#8a8d7d;margin-top:22px">Press <b>Reply</b> to answer ${escapeHtml(inq.name)} at ${escapeHtml(inq.email)}.</p>`,
  );
  const text = `New contact message - ${needsYou ? 'NEEDS YOUR ATTENTION' : 'answered automatically'}

Name: ${inq.name}
Email: ${inq.email}
Subject: ${inq.subject}
Project type: ${inq.projectType || '-'}
Submitted: ${formatKarachiTime(inq.createdAt)}
Conversation ID: ${inq.conversationId || inq.id}

--- Original message ---
${inq.message}

--- AI-generated response ---
${aiText}

${aiMeta}

Reply to this email to answer ${inq.name}.`;
  return {
    to: env.mail.notifyTo,
    subject: `[Portfolio]${needsYou ? ' (needs you)' : ''} ${oneLine(inq.subject)}`.slice(0, 200),
    html,
    text,
    replyTo: `${oneLine(inq.name).replace(/[<>",]/g, '')} <${inq.email}>`,
  };
}

/** Only greet by name if it looks like a real name (visitor-controlled text is a spam vector). */
export function safeFirstName(name = '') {
  const first = String(name).trim().split(/\s+/)[0] || '';
  return /^[\p{L}][\p{L}'-]{0,19}$/u.test(first) ? first : 'there';
}

/** Automatic reply to the visitor. Fixed subject; the body is the audited AI draft or a fixed template. */
export function buildVisitorReply(inq, { body, ownerName, ownerEmail }) {
  const first = ownerName.split(' ')[0];
  const content =
    body ||
    `Hi ${safeFirstName(inq.name)},\n\nThank you for reaching out through my portfolio. Your message has been received, and ${first} will read it personally and get back to you as soon as possible.`;
  const footer = `This is an automatic reply prepared from the information on ${ownerName}'s portfolio. ${first} reads every message and will follow up personally if needed. Just reply to this email to reach him directly.`;
  const html = shell(
    escapeHtml(ownerName),
    `<div style="white-space:pre-wrap;font-size:15px;line-height:1.65">${escapeHtml(content)}</div>
<p style="font-size:15px;margin:18px 0 0">- ${escapeHtml(ownerName)}</p>
<p style="font-size:12px;color:#8a8d7d;margin:22px 0 0;border-top:1px solid #eee;padding-top:12px">${escapeHtml(footer)}</p>`,
  );
  return {
    to: inq.email,
    subject: `Thanks for getting in touch - ${ownerName}`,
    html,
    text: `${content}\n\n- ${ownerName}\n\n--\n${footer}`,
    replyTo: `${ownerName} <${ownerEmail}>`,
    // RFC 3834: mark as an auto-reply so mail servers and autoresponders don't loop.
    headers: { 'Auto-Submitted': 'auto-replied', 'X-Auto-Response-Suppress': 'All' },
  };
}
