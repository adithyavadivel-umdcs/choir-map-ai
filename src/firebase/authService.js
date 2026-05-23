import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, provider } from './firebaseConfig';

export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function signOutUser() {
  return signOut(auth);
}

// Calls callback immediately with current user, then on every auth state change.
// Returns the unsubscribe function.
export function subscribeToAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}
