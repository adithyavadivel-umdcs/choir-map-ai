import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

// Firestore path: users/{userId}/choirs/{choirId}

function choirsRef(userId) {
  return collection(db, 'users', userId, 'choirs');
}

function choirRef(userId, choirId) {
  return doc(db, 'users', userId, 'choirs', choirId);
}

// Load all choirs for a user. Returns an array in the same shape as the
// localStorage choirs array, or [] if none exist yet.
export async function loadChoirsFromFirestore(userId) {
  const snap = await getDocs(choirsRef(userId));
  return snap.docs.map((d) => d.data());
}

// Overwrite a single choir document (create or update).
export async function saveChoirToFirestore(userId, choir) {
  await setDoc(choirRef(userId, choir.id), choir);
}

// Write all choirs in one batch of individual setDoc calls.
export async function saveChoirsToFirestore(userId, choirs) {
  await Promise.all(choirs.map((choir) => saveChoirToFirestore(userId, choir)));
}

// Remove a single choir document.
export async function deleteChoirFromFirestore(userId, choirId) {
  await deleteDoc(choirRef(userId, choirId));
}
