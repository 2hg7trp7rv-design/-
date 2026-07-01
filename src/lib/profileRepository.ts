import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { withTimeout } from './async';
import { getFirebaseDb } from './firebase';
import { isOwnerUser } from './ownerRepository';
import {
  PROFILE_VERSION,
  createPublicId,
  isSafePublicProfile,
  normalizeNickname,
  validateNickname,
  type PublicProfile,
} from './profile';

export const PROFILE_TIMEOUT_MS = 10_000;
export const PUBLIC_ID_LOCK_COLLECTION = 'publicIds';

function getDbOrThrow() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore is not available.');
  return db;
}

function getProfileRef(uid: string) {
  return doc(getDbOrThrow(), 'profiles', uid);
}

function getPublicIdLockRef(publicId: string) {
  return doc(getDbOrThrow(), PUBLIC_ID_LOCK_COLLECTION, publicId);
}

function toProfileCandidate(data: DocumentData | undefined): PublicProfile | null {
  if (!data) return null;

  return {
    publicId: typeof data.publicId === 'string' ? data.publicId : '',
    nickname: typeof data.nickname === 'string' ? data.nickname : '',
    profileVersion: data.profileVersion,
  } as PublicProfile;
}

function fromProfileData(
  data: DocumentData | undefined,
  options: { allowReservedNickname?: boolean } = {},
): PublicProfile | null {
  const candidate = toProfileCandidate(data);
  if (!candidate) return null;

  return isSafePublicProfile(candidate, {
    allowReservedWords: options.allowReservedNickname,
  })
    ? candidate
    : null;
}

export async function readPublicProfile(uid: string): Promise<PublicProfile | null> {
  const snapshot = await withTimeout(
    getDoc(getProfileRef(uid)),
    PROFILE_TIMEOUT_MS,
    'プロフィール読み込み',
  );

  if (!snapshot.exists()) return null;

  const regularProfile = fromProfileData(snapshot.data());
  if (regularProfile) return regularProfile;

  const ownerProfile = fromProfileData(snapshot.data(), {
    allowReservedNickname: await isOwnerUser(uid),
  });

  return ownerProfile;
}

export async function savePublicProfile(
  uid: string,
  nicknameInput: string,
  existingProfile: PublicProfile | null,
): Promise<PublicProfile> {
  const validation = validateNickname(nicknameInput, { allowReservedWords: true });

  if (validation.errors.length > 0) {
    throw new Error(validation.errors[0]);
  }

  if (validation.reservedWordUsed) {
    const owner = await isOwnerUser(uid);

    if (!owner) {
      throw new Error(
        '運営者名は管理者登録済みアカウントだけ使用できます。Firebase AuthenticationのUIDを ownerUsers に登録してください。',
      );
    }
  }

  const nickname = normalizeNickname(validation.nickname);

  if (existingProfile) {
    const db = getDbOrThrow();

    await withTimeout(
      runTransaction(db, async (transaction) => {
        const lockRef = getPublicIdLockRef(existingProfile.publicId);
        const lockSnapshot = await transaction.get(lockRef);

        if (!lockSnapshot.exists()) {
          transaction.set(lockRef, {
            ownerUid: uid,
            createdAt: serverTimestamp(),
          });
        }

        transaction.update(getProfileRef(uid), {
          nickname,
          profileVersion: PROFILE_VERSION,
          updatedAt: serverTimestamp(),
        });
      }),
      PROFILE_TIMEOUT_MS,
      'ニックネーム保存',
    );

    return {
      ...existingProfile,
      nickname,
      profileVersion: PROFILE_VERSION,
    };
  }

  const profile: PublicProfile = {
    publicId: createPublicId(),
    nickname,
    profileVersion: PROFILE_VERSION,
  };

  const batch = writeBatch(getDbOrThrow());
  batch.set(getPublicIdLockRef(profile.publicId), {
    ownerUid: uid,
    createdAt: serverTimestamp(),
  });
  batch.set(getProfileRef(uid), {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await withTimeout(batch.commit(), PROFILE_TIMEOUT_MS, 'プロフィール作成');

  return profile;
}
