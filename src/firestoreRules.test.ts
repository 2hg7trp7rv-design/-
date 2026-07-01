import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Firestore public ranking rules', () => {
  it('uses the privacy-safe v2 public leaderboard collection', () => {
    const leaderboardSource = readFileSync(
      resolve(process.cwd(), 'src/lib/leaderboard.ts'),
      'utf-8',
    );
    const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf-8');

    expect(leaderboardSource).toContain("ONLINE_SCORE_COLLECTION = 'publicLeaderboardsV2'");
    expect(rules).toContain('match /publicLeaderboardsV2/{difficulty}/scores/{publicId}');
    expect(rules).toContain('match /leaderboards/{document=**}');
    expect(rules).toContain('allow read, write: if false;');
  });

  it('does not use document-field validation as a list-query read filter', () => {
    const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf-8');
    const publicReadBlock = rules.slice(
      rules.indexOf('match /publicLeaderboardsV2/{difficulty}/scores/{publicId}'),
      rules.indexOf('allow create:', rules.indexOf('match /publicLeaderboardsV2')),
    );

    expect(publicReadBlock).toContain('allow list: if validDifficulty(difficulty)');
    expect(publicReadBlock).toContain('request.query.limit <= 100');
    expect(publicReadBlock).not.toContain('validScoreData(resource.data');
  });

  it('claims public ids before a public leaderboard document can be written', () => {
    const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf-8');

    expect(rules).toContain('match /publicIds/{publicId}');
    expect(rules).toContain('allow list: if false;');
    expect(rules).toContain('publicIdOwnerMatches(publicId)');
    expect(rules).toContain('publicIdLockWillBelongTo(request.resource.data.publicId, uid)');
  });

  it('mirrors nickname privacy restrictions in Firestore rules', () => {
    const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf-8');

    expect(rules).toContain('function forbiddenNickname(nickname)');
    expect(rules).toContain('[Gg][Oo][Oo][Gg][Ll][Ee]');
    expect(rules).toContain('.*運営.*');
    expect(rules).toContain('.*\\\\.io.*');
  });
  it('lets only ownerUsers opt into reserved operator nicknames', () => {
    const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf-8');

    expect(rules).toContain('match /ownerUsers/{uid}');
    expect(rules).toContain('get(ownerUserPath(request.auth.uid)).data.enabled == true');
    expect(rules).toContain('(!forbiddenNickname(nickname) || isOwner())');
    expect(rules).toContain('allow create, update, delete: if false;');
  });
});
