import { doc, getDoc } from 'firebase/firestore';
import { withTimeout } from './async';
import { getFirebaseDb } from './firebase';

export const OWNER_USER_COLLECTION = 'ownerUsers';
export const OWNER_STATUS_TIMEOUT_MS = 8_000;

function getDbOrThrow() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore is not available.');
  return db;
}

export function getOwnerUserRef(uid: string) {
  return doc(getDbOrThrow(), OWNER_USER_COLLECTION, uid);
}

export async function isOwnerUser(uid: string): Promise<boolean> {
  const snapshot = await withTimeout(
    getDoc(getOwnerUserRef(uid)),
    OWNER_STATUS_TIMEOUT_MS,
    '運営者権限の確認',
  );

  if (!snapshot.exists()) return false;

  const data = snapshot.data();
  return data.enabled === true;
}
