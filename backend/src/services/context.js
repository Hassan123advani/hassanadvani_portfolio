import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { env, isConfigured } from '../config/env.js';
import { unavailable } from '../utils/errors.js';

let app;

function firebaseApp() {
  if (app) return app;
  if (!isConfigured.firebase()) {
    throw unavailable(
      'Firebase Admin is not configured on the server. Add the service account to backend/.env.',
      'FIREBASE_NOT_CONFIGURED',
    );
  }
  if (env.onGoogleCloud && !env.firebase.serviceAccountPath && !env.firebase.privateKey) {
    // Cloud Functions: use the function's built-in service identity (no key file needed).
    app = getApps()[0] || initializeApp();
    getFirestore(app).settings({ ignoreUndefinedProperties: true });
    return app;
  }
  const credential = env.firebase.serviceAccountPath
    ? cert(JSON.parse(readFileSync(env.firebase.serviceAccountPath, 'utf8')))
    : cert({
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        privateKey: env.firebase.privateKey,
      });
  app = getApps()[0] || initializeApp({ credential, projectId: env.firebase.projectId });
  getFirestore(app).settings({ ignoreUndefinedProperties: true });
  return app;
}

/**
 * Service locator. Route code calls services.db() / services.auth() so tests
 * can swap in in-memory fakes without touching real Firebase.
 */
export const services = {
  db: () => getFirestore(firebaseApp()),
  auth: () => getAuth(firebaseApp()),
};
