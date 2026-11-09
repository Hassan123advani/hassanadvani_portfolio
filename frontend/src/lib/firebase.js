import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { firebaseConfig, firebaseReady } from './config.js';

let auth = null;

/** Lazily initialise Firebase (only the admin area uses it). Returns null if not configured. */
export function getFirebaseAuth() {
  if (!firebaseReady) return null;
  if (!auth) auth = getAuth(initializeApp(firebaseConfig));
  return auth;
}
