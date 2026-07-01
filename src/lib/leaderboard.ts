import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import {
  DIFFICULTY_CONFIG,
  getAccuracyPercent,
  getPlayLevelInfo,
  getStarRating,
  type Difficulty,
} from '../store/gameStore';
import { getFirebaseDb, isFirebaseConfigured } from './firebase';
import type { AuthUser } from './authTypes';
import type { PublicProfile } from './profile';

export type OnlineSaveStatus = 'created' | 'updated' | 'not_improved';

export interface ScoreSubmission {
  user: AuthUser;
  profile: PublicProfile;
  difficulty: Difficulty;
  score: number;
  maxCombo: number;
  goodHits: number;
  badHits: number;
  missedFriendly: number;
}

export interface OnlineScoreEntry {
  id: string;
  publicId: string;
  nickname: string;
  difficulty: Difficulty;
  score: number;
  stars: number;
  maxCombo: number;
  accuracy: number;
  goodHits: number;
  badHits: number;
  missedFriendly: number;
  totalJudged: number;
  playLevel: number;
  updatedAtLabel: string;
}

export interface OnlineSaveResult {
  status: OnlineSaveStatus;
  previousScore: number | null;
  entry: OnlineScoreEntry | null;
}

export const ONLINE_LEADERBOARD_LIMIT = 100;
export const ONLINE_SCORE_COLLECTION = 'publicLeaderboardsV2';
export const ONLINE_SCORE_VERSION = 'client-v2';
export const MAX_SCORE = 999_999;
export const MAX_GOOD_HITS = 500;
export const MAX_BAD_HITS = 250;
export const MAX_MISSED_FRIENDLY = 500;
export const MAX_COMBO = 500;
export const MAX_SCORE_PER_GOOD_HIT = 350;
export const FORBIDDEN_PUBLIC_FIELDS = ['uid', 'email', 'displayName', 'photoURL', 'providerId'];

function isDifficulty(value: string): value is Difficulty {
  return value === 'easy' || value === 'normal' || value === 'hard';
}

function getDifficultyCollectionPath(difficulty: Difficulty): [string, Difficulty, string] {
  return [ONLINE_SCORE_COLLECTION, difficulty, 'scores'];
}

function assertFirebaseConfigured(): void {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Check Vercel environment variables.');
  }
}

function assertOnlineDb() {
  assertFirebaseConfigured();
  const db = getFirebaseDb();

  if (!db) {
    throw new Error('Firestore is not available.');
  }

  return db;
}

function normalizeTimestampLabel(value: unknown): string {
  const maybeTimestamp = value as Timestamp | undefined;
  const date = maybeTimestamp?.toDate?.();

  if (!date) return '';

  return date.toLocaleDateString('en-US');
}

function hasForbiddenPublicFields(data: Record<string, unknown>): boolean {
  return FORBIDDEN_PUBLIC_FIELDS.some((field) => field in data);
}

function toOnlineScoreEntry(id: string, data: Record<string, unknown>): OnlineScoreEntry | null {
  if (hasForbiddenPublicFields(data)) return null;
  if (typeof data.publicId !== 'string' || typeof data.nickname !== 'string') return null;

  const difficulty =
    typeof data.difficulty === 'string' && isDifficulty(data.difficulty)
      ? data.difficulty
      : 'normal';

  return {
    id,
    publicId: data.publicId,
    nickname: data.nickname,
    difficulty,
    score: typeof data.score === 'number' ? data.score : 0,
    stars: typeof data.stars === 'number' ? data.stars : 0,
    maxCombo: typeof data.maxCombo === 'number' ? data.maxCombo : 0,
    accuracy: typeof data.accuracy === 'number' ? data.accuracy : 0,
    goodHits: typeof data.goodHits === 'number' ? data.goodHits : 0,
    badHits: typeof data.badHits === 'number' ? data.badHits : 0,
    missedFriendly: typeof data.missedFriendly === 'number' ? data.missedFriendly : 0,
    totalJudged: typeof data.totalJudged === 'number' ? data.totalJudged : 0,
    playLevel: typeof data.playLevel === 'number' ? data.playLevel : 1,
    updatedAtLabel: normalizeTimestampLabel(data.updatedAt),
  };
}

export function validateScoreSubmission(submission: ScoreSubmission): string[] {
  const errors: string[] = [];
  const totalJudged = submission.goodHits + submission.badHits + submission.missedFriendly;

  if (!submission.user.uid) errors.push('You must sign in before saving a score.');
  if (!submission.profile.publicId) errors.push('A public ranking profile is required.');
  if (!submission.profile.nickname) errors.push('A nickname is required before saving.');
  if (!Number.isInteger(submission.score) || submission.score < 0 || submission.score > MAX_SCORE) {
    errors.push('Score is outside the allowed range.');
  }
  if (
    !Number.isInteger(submission.goodHits) ||
    submission.goodHits < 0 ||
    submission.goodHits > MAX_GOOD_HITS
  ) {
    errors.push('Good hit count is outside the allowed range.');
  }
  if (
    !Number.isInteger(submission.badHits) ||
    submission.badHits < 0 ||
    submission.badHits > MAX_BAD_HITS
  ) {
    errors.push('Trap hit count is outside the allowed range.');
  }
  if (
    !Number.isInteger(submission.missedFriendly) ||
    submission.missedFriendly < 0 ||
    submission.missedFriendly > MAX_MISSED_FRIENDLY
  ) {
    errors.push('Miss count is outside the allowed range.');
  }
  if (
    !Number.isInteger(submission.maxCombo) ||
    submission.maxCombo < 0 ||
    submission.maxCombo > MAX_COMBO
  ) {
    errors.push('Max combo is outside the allowed range.');
  }
  if (submission.maxCombo > submission.goodHits) {
    errors.push('Max combo cannot exceed good hits.');
  }
  if (submission.score > 0 && submission.goodHits <= 0) {
    errors.push('A positive score requires at least one good hit.');
  }
  if (submission.score > Math.max(1, submission.goodHits) * MAX_SCORE_PER_GOOD_HIT) {
    errors.push('Score is too high for the recorded hit count.');
  }
  if (totalJudged <= 0 && submission.score > 0) {
    errors.push('A scored run needs recorded actions.');
  }
  if (!DIFFICULTY_CONFIG[submission.difficulty]) {
    errors.push('Unknown difficulty.');
  }

  return errors;
}

export function createOnlineScorePayload(submission: ScoreSubmission) {
  const totalJudged = submission.goodHits + submission.badHits + submission.missedFriendly;
  const accuracy = getAccuracyPercent(
    submission.goodHits,
    submission.badHits,
    submission.missedFriendly,
  );
  const playLevel = getPlayLevelInfo(submission.maxCombo).level;

  return {
    publicId: submission.profile.publicId,
    nickname: submission.profile.nickname,
    difficulty: submission.difficulty,
    score: submission.score,
    stars: getStarRating(submission.score, submission.difficulty),
    maxCombo: submission.maxCombo,
    accuracy,
    goodHits: submission.goodHits,
    badHits: submission.badHits,
    missedFriendly: submission.missedFriendly,
    totalJudged,
    playLevel,
    playVersion: ONLINE_SCORE_VERSION,
  };
}

export async function fetchOnlineLeaderboard(difficulty: Difficulty): Promise<OnlineScoreEntry[]> {
  const db = assertOnlineDb();
  const scoresRef = collection(db, ...getDifficultyCollectionPath(difficulty));
  const snapshot = await getDocs(
    query(scoresRef, orderBy('score', 'desc'), limit(ONLINE_LEADERBOARD_LIMIT)),
  );

  return snapshot.docs
    .map((scoreDoc) => toOnlineScoreEntry(scoreDoc.id, scoreDoc.data()))
    .filter((entry): entry is OnlineScoreEntry => entry !== null);
}

export async function submitOnlineScore(submission: ScoreSubmission): Promise<OnlineSaveResult> {
  const validationErrors = validateScoreSubmission(submission);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors[0]);
  }

  const db = assertOnlineDb();
  const payload = createOnlineScorePayload(submission);
  const scoreRef = doc(
    db,
    ...getDifficultyCollectionPath(submission.difficulty),
    submission.profile.publicId,
  );

  let result: OnlineSaveResult = {
    status: 'not_improved',
    previousScore: null,
    entry: null,
  };

  await runTransaction(db, async (transaction) => {
    const currentSnapshot = await transaction.get(scoreRef);
    const currentData = currentSnapshot.exists() ? currentSnapshot.data() : null;
    const previousScore = typeof currentData?.score === 'number' ? currentData.score : null;

    if (previousScore !== null && previousScore >= submission.score) {
      result = {
        status: 'not_improved',
        previousScore,
        entry: toOnlineScoreEntry(scoreRef.id, currentData ?? {}),
      };
      return;
    }

    const data = {
      ...payload,
      createdAt: currentData?.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    transaction.set(scoreRef, data, { merge: true });

    result = {
      status: currentSnapshot.exists() ? 'updated' : 'created',
      previousScore,
      entry: toOnlineScoreEntry(scoreRef.id, data),
    };
  });

  return result;
}
