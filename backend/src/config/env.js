import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Local secrets live in backend/.env.local (git-ignored and NEVER uploaded by `firebase deploy`).
// In Cloud Functions, secrets come from Firebase Secret Manager instead.
const backendDir = fileURLToPath(new URL('../../', import.meta.url));
dotenv.config({ path: [`${backendDir}.env.local`, `${backendDir}.env`], quiet: true });

const list = (v, fallback = []) =>
  v ? v.split(',').map((s) => s.trim()).filter(Boolean) : fallback;

/**
 * Central, read-only view of environment configuration.
 * Secrets are only ever read here and never sent to clients or logs.
 */
export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  trustProxy: process.env.TRUST_PROXY || 'loopback',
  corsOrigins: list(process.env.CORS_ORIGINS, ['http://localhost:5173']),
  siteUrl: (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, ''),
  ipHashSalt: process.env.IP_HASH_SALT || 'change-me',

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'portfolio-datbase',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'portfolio',
  },

  mail: {
    // Resend (https://resend.com). Contact notifications only; the key never leaves the server.
    resendApiKey: process.env.RESEND_API_KEY || '',
    from: process.env.RESEND_FROM || 'Portfolio Contact <onboarding@resend.dev>',
    notifyTo: process.env.CONTACT_NOTIFY_TO || 'hassanadvani08@gmail.com',
  },

  ai: {
    // Server-side only. In Cloud Functions it comes from Secret Manager.
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.AI_MODEL || 'claude-opus-5-5',
    effort: process.env.AI_EFFORT || 'low',
    enabled: process.env.AI_REPLY_ENABLED !== 'false',
  },

  autoReply: {
    // Visitor auto-replies are only possible from a verified Resend domain.
    enabled: process.env.AUTO_REPLY_ENABLED !== 'false',
    dailyLimit: Number(process.env.AUTO_REPLY_DAILY_LIMIT || 50),
    perRecipientHours: Number(process.env.AUTO_REPLY_PER_RECIPIENT_HOURS || 24),
    ownerName: process.env.OWNER_NAME || 'Hassan Advani',
  },

  // True inside Cloud Functions / Cloud Run (Google sets K_SERVICE).
  onGoogleCloud: Boolean(process.env.K_SERVICE || process.env.FUNCTION_TARGET),
  // Locally the contact route runs the pipeline in the background; deployed, a Firestore trigger does.
  inlineProcessing: process.env.INQUIRY_INLINE !== 'false',

  github: {
    username: process.env.GITHUB_USERNAME || 'Hassan123advani',
    token: process.env.GITHUB_TOKEN || '',
  },
});

export const isConfigured = {
  firebase: () =>
    env.onGoogleCloud ||
    Boolean(env.firebase.serviceAccountPath) ||
    Boolean(env.firebase.projectId && env.firebase.clientEmail && env.firebase.privateKey),
  cloudinary: () =>
    Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret),
  mail: () => Boolean(env.mail.resendApiKey && env.mail.from && env.mail.notifyTo),
  ai: () => Boolean(env.ai.enabled && env.ai.apiKey),
  /** Resend's shared sandbox sender can only reach the account owner, never visitors. */
  visitorEmail: () =>
    Boolean(env.autoReply.enabled && isConfigured.mail() && !/@resend\.dev>?\s*$/i.test(env.mail.from)),
};
