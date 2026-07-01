import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_HIGH_SCORES,
  DIFFICULTY_CONFIG,
  TIME_BONUS_SECONDS,
  calculateHitResult,
  getPlayLevelInfo,
  getAccuracyPercent,
  useGameStore,
} from './gameStore';

describe('gameStore scoring and lifecycle rules', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().clearAllData();
  });

  it('does not expose legacy screen or isPlaying state flags', () => {
    const state = useGameStore.getState() as unknown as Record<string, unknown>;

    expect(state.screen).toBeUndefined();
    expect(state.isPlaying).toBeUndefined();
    expect(state.setScreen).toBeUndefined();
  });

  it('breaks combo without increasing misses', () => {
    useGameStore.setState({ gameStatus: 'playing', combo: 5, missedFriendly: 2 });

    useGameStore.getState().breakCombo();

    expect(useGameStore.getState().combo).toBe(0);
    expect(useGameStore.getState().missedFriendly).toBe(2);
  });

  it('missHit breaks combo and increases misses only while playing', () => {
    useGameStore.setState({ gameStatus: 'playing', combo: 4, missedFriendly: 0 });

    useGameStore.getState().missHit();

    expect(useGameStore.getState().combo).toBe(0);
    expect(useGameStore.getState().missedFriendly).toBe(1);

    useGameStore.setState({ gameStatus: 'paused', combo: 3 });
    useGameStore.getState().missHit();

    expect(useGameStore.getState().combo).toBe(3);
    expect(useGameStore.getState().missedFriendly).toBe(1);
  });

  it('does not let angry moles increase maxCombo', () => {
    useGameStore.setState({
      gameStatus: 'playing',
      score: 100,
      combo: 9,
      maxCombo: 9,
      goodHits: 0,
      badHits: 0,
    });

    useGameStore.getState().hitMole('angry');

    const state = useGameStore.getState();
    expect(state.score).toBe(95);
    expect(state.combo).toBe(0);
    expect(state.maxCombo).toBe(9);
    expect(state.goodHits).toBe(0);
    expect(state.badHits).toBe(1);
  });

  it('keeps endGame idempotent', () => {
    useGameStore.setState({
      gameStatus: 'playing',
      score: 320,
      maxCombo: 6,
      totalGames: 0,
      totalScore: 0,
      leaderboard: [],
      highScoreByDifficulty: { ...DEFAULT_HIGH_SCORES },
    });

    useGameStore.getState().endGame();
    useGameStore.getState().endGame();

    const state = useGameStore.getState();
    expect(state.gameStatus).toBe('gameover');
    expect(state.totalGames).toBe(1);
    expect(state.totalScore).toBe(320);
    expect(state.leaderboard).toHaveLength(1);
  });

  it('uses difficulty duration when resetting idle game state', () => {
    useGameStore.getState().setDifficulty('easy');
    useGameStore.getState().resetGame();

    expect(useGameStore.getState().timeLeft).toBe(DIFFICULTY_CONFIG.easy.gameDuration);
  });

  it('clears leaderboard and all difficulty best scores together', () => {
    useGameStore.setState({
      highScore: 999,
      highScoreByDifficulty: { easy: 100, normal: 999, hard: 50 },
      leaderboard: [
        {
          id: 'entry-1',
          score: 999,
          date: '1/1/2026',
          difficulty: 'normal',
          maxCombo: 12,
        },
      ],
      lastScoreId: 'entry-1',
    });

    useGameStore.getState().clearLeaderboard();

    const state = useGameStore.getState();
    expect(state.highScore).toBe(0);
    expect(state.highScoreByDifficulty).toEqual(DEFAULT_HIGH_SCORES);
    expect(state.leaderboard).toEqual([]);
    expect(state.lastScoreId).toBeNull();
  });

  it('persists language as a user setting without touching score state', () => {
    useGameStore.getState().setLanguage('ja');

    const state = useGameStore.getState();
    expect(state.language).toBe('ja');
    expect(state.score).toBe(0);
    expect(state.gameStatus).toBe('idle');
  });

  it('calculates hit results without mutating combo rules for angry moles', () => {
    expect(calculateHitResult({ score: 100, combo: 2, maxCombo: 2 }, 'normal')).toEqual({
      points: 15,
      nextScore: 115,
      nextCombo: 3,
      nextMaxCombo: 3,
      timeBonus: 0,
      nextLevel: 1,
      nextLevelMultiplier: 1,
      leveledUp: false,
    });

    expect(calculateHitResult({ score: 100, combo: 8, maxCombo: 8 }, 'angry')).toEqual({
      points: -5,
      nextScore: 95,
      nextCombo: 0,
      nextMaxCombo: 8,
      timeBonus: 0,
      nextLevel: 1,
      nextLevelMultiplier: 1,
      leveledUp: false,
    });
  });

  it('adds unlimited score-attack time bonuses at every 10 combos', () => {
    expect(calculateHitResult({ score: 500, combo: 9, maxCombo: 9 }, 'normal')).toMatchObject({
      points: 32,
      nextCombo: 10,
      nextMaxCombo: 10,
      timeBonus: TIME_BONUS_SECONDS,
      nextLevel: 2,
      nextLevelMultiplier: 1.05,
      leveledUp: true,
    });

    expect(calculateHitResult({ score: 2500, combo: 49, maxCombo: 49 }, 'golden')).toMatchObject({
      points: 195,
      nextCombo: 50,
      nextMaxCombo: 50,
      timeBonus: TIME_BONUS_SECONDS,
      nextLevel: 5,
      nextLevelMultiplier: 1.3,
      leveledUp: false,
    });
  });

  it('keeps play levels for the current run based on max combo', () => {
    expect(getPlayLevelInfo(0)).toMatchObject({ level: 1, multiplier: 1 });
    expect(getPlayLevelInfo(40)).toMatchObject({ level: 5, multiplier: 1.3 });
    expect(getPlayLevelInfo(120)).toMatchObject({ level: 10, multiplier: 2.2 });
  });

  it('extends time through hitMole when reaching a combo milestone', () => {
    useGameStore.setState({
      gameStatus: 'playing',
      score: 0,
      timeLeft: 12,
      combo: 9,
      maxCombo: 9,
      goodHits: 0,
      badHits: 0,
    });

    useGameStore.getState().hitMole('normal');

    const state = useGameStore.getState();
    expect(state.combo).toBe(10);
    expect(state.maxCombo).toBe(10);
    expect(state.timeLeft).toBe(17);
    expect(state.score).toBe(32);
  });
  it('tracks run accuracy from good hits, bad hits, and missed friendly moles', () => {
    useGameStore.setState({
      gameStatus: 'playing',
      score: 100,
      combo: 3,
      maxCombo: 3,
      goodHits: 0,
      badHits: 0,
      missedFriendly: 0,
    });

    useGameStore.getState().hitMole('normal');
    useGameStore.getState().hitMole('angry');
    useGameStore.getState().missHit();

    const state = useGameStore.getState();
    expect(state.goodHits).toBe(1);
    expect(state.badHits).toBe(1);
    expect(state.missedFriendly).toBe(1);
    expect(getAccuracyPercent(state.goodHits, state.badHits, state.missedFriendly)).toBe(33);
  });

  it('rolls current run hit quality into cumulative stats only once at game over', () => {
    useGameStore.setState({
      gameStatus: 'playing',
      score: 600,
      goodHits: 7,
      badHits: 1,
      missedFriendly: 2,
      cumulativeGoodHits: 10,
      cumulativeBadHits: 2,
      cumulativeMissedFriendly: 3,
    });

    useGameStore.getState().endGame();
    useGameStore.getState().endGame();

    const state = useGameStore.getState();
    expect(state.cumulativeGoodHits).toBe(17);
    expect(state.cumulativeBadHits).toBe(3);
    expect(state.cumulativeMissedFriendly).toBe(5);
  });
});
