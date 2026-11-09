/**
 * Firebase Cloud Functions entry point (2nd gen).
 *
 *   api                - the same Express app used locally (public site API + admin API + contact form)
 *   onInquiryCreated   - runs the AI + email pipeline for every new contact message
 *   retryInquiries     - every 10 minutes, retries inquiries whose AI/email step failed transiently
 *
 * Secrets are stored in Google Secret Manager and injected as environment variables:
 *   firebase functions:secrets:set RESEND_API_KEY
 *   firebase functions:secrets:set ANTHROPIC_API_KEY
 *   firebase functions:secrets:set CLOUDINARY_API_SECRET
 *   firebase functions:secrets:set IP_HASH_SALT
 */
import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const CLOUDINARY_API_SECRET = defineSecret('CLOUDINARY_API_SECRET');
const IP_HASH_SALT = defineSecret('IP_HASH_SALT');

setGlobalOptions({ region: 'asia-south1', maxInstances: 5 });

// Secret values are only available at runtime, so modules that read env are loaded lazily.
const load = async () => ({ ...(await import('./app.js')), ...(await import('./services/inquiries.js')) });

let app;
export const api = onRequest(
  { secrets: [RESEND_API_KEY, ANTHROPIC_API_KEY, CLOUDINARY_API_SECRET, IP_HASH_SALT], memory: '512MiB', timeoutSeconds: 60, invoker: 'public' },
  async (req, res) => {
    if (!app) app = (await load()).createApp();
    return app(req, res);
  },
);

export const onInquiryCreated = onDocumentCreated(
  { document: 'messages/{id}', secrets: [RESEND_API_KEY, ANTHROPIC_API_KEY], timeoutSeconds: 120, retry: false },
  async (event) => {
    const { processInquiry } = await load();
    const result = await processInquiry(event.params.id);
    logger.info('inquiry processed', {
      id: event.params.id,
      state: result.pipelineState,
      ai: result.ai?.status,
      visitor: result.delivery?.visitor?.status,
      owner: result.delivery?.owner?.status,
    });
  },
);

export const retryInquiries = onSchedule(
  { schedule: 'every 10 minutes', secrets: [RESEND_API_KEY, ANTHROPIC_API_KEY], timeoutSeconds: 300 },
  async () => {
    const { retryDueInquiries } = await load();
    logger.info('retry sweep', await retryDueInquiries());
  },
);
