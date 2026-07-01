import { describe, expect, it } from 'vitest';
import {
  createOnlineScorePayload,
  FORBIDDEN_PUBLIC_FIELDS,
  MAX_SCORE_PER_GOOD_HIT,
  validateScoreSubmission,
  type ScoreSubmission,
} from './leaderboard';

const baseSubmission: ScoreSubmission = {
  user: {
    uid: 'uid-123',
  },
  profile: {
    publicId: 'mogu_public123',
    nickname: 'Mogu Tester',
    profileVersion: 'profile-v1',
  },
  difficulty: 'normal',
  score: 1200,
  maxCombo: 20,
  goodHits: 30,
  badHits: 1,
  missedFriendly: 2,
};

describe('online leaderboard validation', () => {
  it('accepts a plausible score submission and creates privacy-safe payload', () => {
    expect(validateScoreSubmission(baseSubmission)).toEqual([]);

    const payload = createOnlineScorePayload(baseSubmission);

    expect(payload.publicId).toBe('mogu_public123');
    expect(payload.nickname).toBe('Mogu Tester');
    expect(payload.difficulty).toBe('normal');
    expect(payload.totalJudged).toBe(33);
    expect(payload.playVersion).toBe('client-v2');

    FORBIDDEN_PUBLIC_FIELDS.forEach((field) => {
      expect(payload).not.toHaveProperty(field);
    });
  });

  it('rejects positive scores without good hits', () => {
    expect(
      validateScoreSubmission({
        ...baseSubmission,
        score: 10,
        maxCombo: 0,
        goodHits: 0,
      }),
    ).toContain('A positive score requires at least one good hit.');
  });

  it('rejects scores that are too high for the recorded hit count', () => {
    expect(
      validateScoreSubmission({
        ...baseSubmission,
        score: MAX_SCORE_PER_GOOD_HIT * 2 + 1,
        maxCombo: 2,
        goodHits: 2,
      }),
    ).toContain('Score is too high for the recorded hit count.');
  });

  it('rejects max combo values greater than good hits', () => {
    expect(
      validateScoreSubmission({
        ...baseSubmission,
        maxCombo: 40,
        goodHits: 10,
      }),
    ).toContain('Max combo cannot exceed good hits.');
  });
});
