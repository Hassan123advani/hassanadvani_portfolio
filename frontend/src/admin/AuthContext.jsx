import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  browserSessionPersistence,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getFirebaseAuth } from '../lib/firebase.js';
import { adminApi, setTokenProvider } from '../lib/api.js';

const AuthContext = createContext(null);

const FIREBASE_ERRORS = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been deactivated.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/configuration-not-found':
    'Firebase Authentication is not enabled for this project yet. Firebase Console → Authentication → Get started → enable Email/Password.',
  'auth/operation-not-allowed': 'Email/Password sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method.',
  'auth/invalid-api-key': 'The Firebase web API key is invalid. Check VITE_FIREBASE_API_KEY in frontend/.env.local.',
};
export const authMessage = (err) => FIREBASE_ERRORS[err?.code] || err?.message || 'Sign-in failed.';

export function AuthProvider({ children }) {
  const auth = getFirebaseAuth();
  const [state, setState] = useState({ status: auth ? 'loading' : 'unconfigured', error: null });

  const loadMe = useCallback(async (user) => {
    try {
      const me = await adminApi.get('/me');
      setState({ status: 'ready', user, ...me, error: null });
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        await signOut(auth);
        setState({ status: 'signedOut', error: err.message });
      } else {
        setState({ status: 'error', user, error: err });
      }
    }
  }, [auth]);

  useEffect(() => {
    if (!auth) return undefined;
    setTokenProvider(() => (auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(null)));
    return onAuthStateChanged(auth, (user) => {
      if (!user) setState((s) => ({ status: 'signedOut', error: s.status === 'signedOut' ? s.error : null }));
      else loadMe(user);
    });
  }, [auth, loadMe]);

  const value = useMemo(
    () => ({
      ...state,
      can: (perm) => state.status === 'ready' && (state.admin?.role === 'super_admin' || state.permissions?.includes(perm)),
      isSuper: state.admin?.role === 'super_admin',
      signIn: async (email, password) => {
        await setPersistence(auth, browserSessionPersistence);
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      signOut: () => signOut(auth),
      sendReset: (email) => sendPasswordResetEmail(auth, email.trim()),
      /** Re-authenticate with the current password, update it, then record the change in the activity log. */
      changePassword: async (currentPassword, newPassword) => {
        const user = auth.currentUser;
        if (!user?.email) throw Object.assign(new Error('Not signed in'), { code: 'auth/user-not-found' });
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
        await updatePassword(user, newPassword);
        await user.getIdToken(true); // fresh token carries the new auth_time
        await adminApi.post('/me/password-changed').catch(() => {}); // audit log is best-effort
      },
      retry: () => auth.currentUser && loadMe(auth.currentUser),
      refresh: () => auth.currentUser && loadMe(auth.currentUser),
    }),
    [state, auth, loadMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
