import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { triggerHaptic } from '../lib/haptics';
import { safeLocalStorage } from '../lib/safeStorage';
import type { Language } from '../lib/i18n';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type MoleType = 'normal' | 'angry' | 'golden';
export type GameStatus = 'idle' | 'countdown' | 'playing' | 'paused' | 'gameover';

export interface ScoreEntry {
  id: string;
  score: number;
  date: string;
  difficulty: Difficulty;
  maxCombo: number;
}

export interface DifficultyConfig {
  spawnInterval: number;
  visibleDuration: number;
  angryChance: number;
  goldenChance: number;
  gameDuration: number;
}

export interface HitResult {
  points: number;
  nextScore: number;
  nextCombo: number;
  nextMaxCombo: number;
  timeBonus: number;
  nextLevel: number;
  nextLevelMultiplier: number;
  leveledUp: boolean;
}

export interface GameState {
  score: number;
  timeLeft: number;
  combo: number;
  maxCombo: number;
  difficulty: Difficulty;
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  language: Language;
  highScore: number;
  highScoreByDifficulty: Record<Difficulty, number>;
  leaderboard: ScoreEntry[];
  gameStatus: GameStatus;
  goodHits: number;
  badHits: number;
  missedFriendly: number;
  cumulativeGoodHits: number;
  cumulativeBadHits: number;
  cumulativeMissedFriendly: number;
  totalGames: number;
  totalScore: number;
  lastScoreId: string | null;

  startGame: () => void;
  beginPlay: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  tick: () => void;
  hitMole: (type: MoleType) => void;
  missHit: () => void;
  breakCombo: () => void;
  setDifficulty: (difficulty: Difficulty) => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  toggleVibration: () => void;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  resetGame: () => void;
  clearLeaderboard: () => void;
  clearAllData: () => void;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    spawnInterval: 1200,
    visibleDuration: 1800,
    angryChance: 0.08,
    goldenChance: 0.06,
    gameDuration: 45,
  },
  normal: {
    spawnInterval: 900,
    visibleDuration: 1200,
    angryChance: 0.15,
    goldenChance: 0.08,
    gameDuration: 30,
  },
  hard: {
    spawnInterval: 550,
    visibleDuration: 800,
    angryChance: 0.28,
    goldenChance: 0.12,
    gameDuration: 30,
  },
};

export const DEFAULT_HIGH_SCORES: Record<Difficulty, number> = {
  easy: 0,
  normal: 0,
  hard: 0,
};

const DEFAULT_DIFFICULTY: Difficulty = 'normal';
const DEFAULT_LANGUAGE: Language = 'ja';

export const TIME_BONUS_COMBO_INTERVAL = 10;
export const TIME_BONUS_SECONDS = 5;

export interface PlayLevelInfo {
  level: number;
  minCombo: number;
  multiplier: number;
}

export const PLAY_LEVELS: PlayLevelInfo[] = [
  { level: 1, minCombo: 0, multiplier: 1 },
  { level: 2, minCombo: 10, multiplier: 1.05 },
  { level: 3, minCombo: 20, multiplier: 1.12 },
  { level: 4, minCombo: 30, multiplier: 1.2 },
  { level: 5, minCombo: 40, multiplier: 1.3 },
  { level: 6, minCombo: 55, multiplier: 1.42 },
  { level: 7, minCombo: 70, multiplier: 1.55 },
  { level: 8, minCombo: 85, multiplier: 1.7 },
  { level: 9, minCombo: 100, multiplier: 1.9 },
  { level: 10, minCombo: 120, multiplier: 2.2 },
];

export function getPlayLevelInfo(maxCombo: number): PlayLevelInfo {
  return PLAY_LEVELS.reduce((currentLevel, levelInfo) => {
    return maxCombo >= levelInfo.minCombo ? levelInfo : currentLevel;
  }, PLAY_LEVELS[0]);
}

export function getComboMultiplier(combo: number): number {
  if (combo >= 10) return 3;
  if (combo >= 6) return 2;
  if (combo >= 3) return 1.5;
  return 1;
}

export function getStarRating(score: number, difficulty: Difficulty): number {
  const thresholds: Record<Difficulty, [number, number, number]> = {
    easy: [400, 1000, 2000],
    normal: [500, 1200, 2200],
    hard: [800, 2500, 5500],
  };

  const [oneStar, twoStars, threeStars] = thresholds[difficulty];
  if (score >= threeStars) return 3;
  if (score >= twoStars) return 2;
  if (score >= oneStar) return 1;
  return 0;
}

export function getAccuracyPercent(
  goodHits: number,
  badHits: number,
  missedFriendly: number,
): number {
  const judgedActions = goodHits + badHits + missedFriendly;
  return judgedActions > 0 ? Math.round((goodHits / judgedActions) * 100) : 0;
}

export function calculateHitResult(
  current: Pick<GameState, 'score' | 'combo' | 'maxCombo'>,
  type: MoleType,
): HitResult {
  const currentLevel = getPlayLevelInfo(current.maxCombo);

  if (type === 'angry') {
    return {
      points: -5,
      nextScore: Math.max(0, current.score - 5),
      nextCombo: 0,
      nextMaxCombo: current.maxCombo,
      timeBonus: 0,
      nextLevel: currentLevel.level,
      nextLevelMultiplier: currentLevel.multiplier,
      leveledUp: false,
    };
  }

  const basePoints = type === 'golden' ? 50 : 10;
  const nextCombo = current.combo + 1;
  const nextMaxCombo = Math.max(current.maxCombo, nextCombo);
  const nextLevel = getPlayLevelInfo(nextMaxCombo);
  const comboMultiplier = getComboMultiplier(nextCombo);
  const points = Math.round(basePoints * comboMultiplier * nextLevel.multiplier);
  const earnsTimeBonus = nextCombo % TIME_BONUS_COMBO_INTERVAL === 0;

  return {
    points,
    nextScore: current.score + points,
    nextCombo,
    nextMaxCombo,
    timeBonus: earnsTimeBonus ? TIME_BONUS_SECONDS : 0,
    nextLevel: nextLevel.level,
    nextLevelMultiplier: nextLevel.multiplier,
    leveledUp: nextLevel.level > currentLevel.level,
  };
}

function createScoreId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString('ja-JP');
}

function normalizeDifficulty(difficulty: unknown): Difficulty {
  return difficulty === 'easy' || difficulty === 'normal' || difficulty === 'hard'
    ? difficulty
    : DEFAULT_DIFFICULTY;
}

function normalizeLanguage(language: unknown): Language {
  return language === 'en' || language === 'ja' ? language : DEFAULT_LANGUAGE;
}

function normalizeHighScores(
  highScoreByDifficulty: Partial<Record<Difficulty, number>> | undefined,
  fallbackDifficulty: Difficulty,
  fallbackHighScore: number | undefined,
): Record<Difficulty, number> {
  const next = {
    ...DEFAULT_HIGH_SCORES,
    ...highScoreByDifficulty,
  };

  if (!highScoreByDifficulty && typeof fallbackHighScore === 'number') {
    next[fallbackDifficulty] = fallbackHighScore;
  }

  return next;
}

const initialState = {
  score: 0,
  timeLeft: DIFFICULTY_CONFIG[DEFAULT_DIFFICULTY].gameDuration,
  combo: 0,
  maxCombo: 0,
  difficulty: DEFAULT_DIFFICULTY,
  soundEnabled: true,
  musicEnabled: true,
  vibrationEnabled: true,
  language: DEFAULT_LANGUAGE,
  highScore: 0,
  highScoreByDifficulty: { ...DEFAULT_HIGH_SCORES },
  leaderboard: [] as ScoreEntry[],
  gameStatus: 'idle' as GameStatus,
  goodHits: 0,
  badHits: 0,
  missedFriendly: 0,
  cumulativeGoodHits: 0,
  cumulativeBadHits: 0,
  cumulativeMissedFriendly: 0,
  totalGames: 0,
  totalScore: 0,
  lastScoreId: null as string | null,
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialState,

      startGame: () => {
        const { difficulty, highScoreByDifficulty } = get();
        const config = DIFFICULTY_CONFIG[difficulty];

        set({
          gameStatus: 'countdown',
          score: 0,
          timeLeft: config.gameDuration,
          combo: 0,
          maxCombo: 0,
          goodHits: 0,
          badHits: 0,
          missedFriendly: 0,
          highScore: highScoreByDifficulty[difficulty],
          lastScoreId: null,
        });
      },

      beginPlay: () => {
        const state = get();
        if (state.gameStatus !== 'countdown') return;

        set({ gameStatus: 'playing' });
      },

      pauseGame: () => {
        const state = get();
        if (state.gameStatus !== 'playing') return;

        set({ gameStatus: 'paused' });
      },

      resumeGame: () => {
        const state = get();
        if (state.gameStatus !== 'paused') return;

        set({ gameStatus: 'playing' });
      },

      endGame: () => {
        const state = get();
        if (state.gameStatus === 'idle' || state.gameStatus === 'gameover') return;

        const currentBestForDifficulty = state.highScoreByDifficulty[state.difficulty] ?? 0;
        const isNewBest = state.score > currentBestForDifficulty;
        const nextHighScoreByDifficulty = {
          ...state.highScoreByDifficulty,
          [state.difficulty]: isNewBest ? state.score : currentBestForDifficulty,
        };

        const entry: ScoreEntry = {
          id: createScoreId(),
          score: state.score,
          date: getTodayLabel(),
          difficulty: state.difficulty,
          maxCombo: state.maxCombo,
        };

        const leaderboard = [...state.leaderboard, entry]
          .sort((a, b) => b.score - a.score)
          .slice(0, 50);

        set({
          gameStatus: 'gameover',
          timeLeft: 0,
          combo: 0,
          highScore: nextHighScoreByDifficulty[state.difficulty],
          highScoreByDifficulty: nextHighScoreByDifficulty,
          leaderboard,
          cumulativeGoodHits: state.cumulativeGoodHits + state.goodHits,
          cumulativeBadHits: state.cumulativeBadHits + state.badHits,
          cumulativeMissedFriendly: state.cumulativeMissedFriendly + state.missedFriendly,
          totalGames: state.totalGames + 1,
          totalScore: state.totalScore + state.score,
          lastScoreId: entry.id,
        });
      },

      tick: () => {
        const state = get();
        if (state.gameStatus !== 'playing') return;

        if (state.timeLeft <= 1) {
          set({ timeLeft: 0 });
          get().endGame();
          return;
        }

        set({ timeLeft: state.timeLeft - 1 });
      },

      hitMole: (type) => {
        const state = get();
        if (state.gameStatus !== 'playing') return;

        const result = calculateHitResult(state, type);

        set({
          score: result.nextScore,
          timeLeft: state.timeLeft + result.timeBonus,
          combo: result.nextCombo,
          maxCombo: result.nextMaxCombo,
          goodHits: type === 'angry' ? state.goodHits : state.goodHits + 1,
          badHits: type === 'angry' ? state.badHits + 1 : state.badHits,
        });

        triggerHaptic(state.vibrationEnabled, type === 'angry' ? 100 : 30);
      },

      missHit: () => {
        const state = get();
        if (state.gameStatus !== 'playing') return;

        set({
          combo: 0,
          missedFriendly: state.missedFriendly + 1,
        });
      },

      breakCombo: () => {
        const state = get();
        if (state.combo === 0) return;

        set({ combo: 0 });
      },

      setDifficulty: (difficulty) => {
        const state = get();
        const config = DIFFICULTY_CONFIG[difficulty];

        set({
          difficulty,
          highScore: state.highScoreByDifficulty[difficulty] ?? 0,
          timeLeft: state.gameStatus === 'idle' ? config.gameDuration : state.timeLeft,
        });
      },

      toggleSound: () => set({ soundEnabled: !get().soundEnabled }),

      toggleMusic: () => set({ musicEnabled: !get().musicEnabled }),

      toggleVibration: () => set({ vibrationEnabled: !get().vibrationEnabled }),

      setLanguage: (language) => set({ language }),

      toggleLanguage: () => set({ language: get().language === 'en' ? 'ja' : 'en' }),

      resetGame: () => {
        const state = get();
        const config = DIFFICULTY_CONFIG[state.difficulty];

        set({
          gameStatus: 'idle',
          score: 0,
          timeLeft: config.gameDuration,
          combo: 0,
          maxCombo: 0,
          goodHits: 0,
          badHits: 0,
          missedFriendly: 0,
          highScore: state.highScoreByDifficulty[state.difficulty] ?? 0,
          lastScoreId: null,
        });
      },

      clearLeaderboard: () => {
        set({
          highScore: 0,
          highScoreByDifficulty: { ...DEFAULT_HIGH_SCORES },
          leaderboard: [],
          lastScoreId: null,
        });
      },

      clearAllData: () =>
        set({
          ...initialState,
          highScoreByDifficulty: { ...DEFAULT_HIGH_SCORES },
          leaderboard: [],
        }),
    }),
    {
      name: 'mogumogu-storage',
      version: 6,
      storage: createJSONStorage(() => safeLocalStorage),
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState;
        }

        const state = persistedState as Partial<GameState> & {
          screen?: unknown;
          isPlaying?: unknown;
          totalHits?: unknown;
          totalMisses?: unknown;
        };
        const difficulty = normalizeDifficulty(state.difficulty);
        const language: Language = version < 6 ? DEFAULT_LANGUAGE : normalizeLanguage(state.language);
        const legacyTotalHits = typeof state.totalHits === 'number' ? state.totalHits : 0;
        const legacyTotalMisses = typeof state.totalMisses === 'number' ? state.totalMisses : 0;
        const cumulativeGoodHits =
          typeof state.cumulativeGoodHits === 'number' ? state.cumulativeGoodHits : legacyTotalHits;
        const cumulativeBadHits =
          typeof state.cumulativeBadHits === 'number' ? state.cumulativeBadHits : 0;
        const cumulativeMissedFriendly =
          typeof state.cumulativeMissedFriendly === 'number'
            ? state.cumulativeMissedFriendly
            : legacyTotalMisses;
        const highScoreByDifficulty = normalizeHighScores(
          state.highScoreByDifficulty,
          difficulty,
          state.highScore,
        );

        return {
          ...state,
          difficulty,
          language,
          highScoreByDifficulty,
          highScore: highScoreByDifficulty[difficulty],
          gameStatus: state.gameStatus === 'playing' ? 'idle' : (state.gameStatus ?? 'idle'),
          score: 0,
          combo: 0,
          maxCombo: 0,
          goodHits: 0,
          badHits: 0,
          missedFriendly: 0,
          cumulativeGoodHits,
          cumulativeBadHits,
          cumulativeMissedFriendly,
          timeLeft: DIFFICULTY_CONFIG[difficulty].gameDuration,
          lastScoreId: null,
          screen: undefined,
          isPlaying: undefined,
          totalHits: undefined,
          totalMisses: undefined,
        };
      },
      partialize: (state) => ({
        highScore: state.highScore,
        highScoreByDifficulty: state.highScoreByDifficulty,
        leaderboard: state.leaderboard,
        difficulty: state.difficulty,
        soundEnabled: state.soundEnabled,
        musicEnabled: state.musicEnabled,
        vibrationEnabled: state.vibrationEnabled,
        language: state.language,
        totalGames: state.totalGames,
        totalScore: state.totalScore,
        cumulativeGoodHits: state.cumulativeGoodHits,
        cumulativeBadHits: state.cumulativeBadHits,
        cumulativeMissedFriendly: state.cumulativeMissedFriendly,
      }),
    },
  ),
);
