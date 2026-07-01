import { useState, useEffect, useCallback, useRef, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, Home, RotateCcw, Cloud, LogIn } from 'lucide-react';
import {
  useGameStore,
  DIFFICULTY_CONFIG,
  TIME_BONUS_COMBO_INTERVAL,
  TIME_BONUS_SECONDS,
  getComboMultiplier,
  getPlayLevelInfo,
  getStarRating,
  getAccuracyPercent,
  calculateHitResult,
  type MoleType,
} from '../store/gameStore';
import { MoleSprite, StarFilled, StarEmpty } from '../components/assets';
import { playGameSound, syncBackgroundMusic, unlockAudio } from '../lib/audio';
import { t } from '../lib/i18n';
import { useAuthStore } from '../store/authStore';
import { GAME_IMAGE_ASSETS } from '../lib/gameImageAssets';
import { useOnlineScoreSave } from '../hooks/useOnlineScoreSave';

interface Mole {
  id: number;
  index: number;
  type: MoleType;
  visible: boolean;
  hit: boolean;
}

interface ScorePopup {
  id: number;
  x: number;
  y: number;
  points: number;
  type: MoleType;
  combo?: number;
  levelMultiplier?: number;
}

interface MilestoneToast {
  id: number;
  combo: number;
  timeBonus: number;
  level: number;
  levelMultiplier: number;
  leveledUp: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  tx: string;
  ty: string;
}

const GRID_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const FRIENDLY_MOLE_TYPES: MoleType[] = ['normal', 'golden'];
const COUNTDOWN_STEPS = [3, 2, 1, 0];

function isFriendlyMole(type: MoleType): boolean {
  return FRIENDLY_MOLE_TYPES.includes(type);
}

function formatMultiplier(multiplier: number): string {
  return multiplier % 1 === 0 ? multiplier.toFixed(0) : multiplier.toFixed(2);
}

export default function Game() {
  const navigate = useNavigate();
  const {
    score,
    timeLeft,
    combo,
    maxCombo,
    difficulty,
    gameStatus,
    language,
    soundEnabled,
    musicEnabled,
    startGame,
    beginPlay,
    pauseGame,
    resumeGame,
    tick,
    hitMole,
    goodHits,
    badHits,
    missedFriendly,
  } = useGameStore();
  const authUser = useAuthStore((state) => state.user);
  const authProfile = useAuthStore((state) => state.profile);
  const isFirebaseConfigured = useAuthStore((state) => state.isConfigured);

  const { onlineSaveStatus, onlineSaveMessage, handleSaveOnline, resetOnlineSave } =
    useOnlineScoreSave({
      authUser,
      authProfile,
      badHits,
      difficulty,
      goodHits,
      isFirebaseConfigured,
      language,
      maxCombo,
      missedFriendly,
      navigate,
      score,
      soundEnabled,
    });

  const [moles, setMoles] = useState<Mole[]>([]);
  const [popups, setPopups] = useState<ScorePopup[]>([]);
  const [milestoneToast, setMilestoneToast] = useState<MilestoneToast | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [countdownNum, setCountdownNum] = useState(3);
  const [hitFlash, setHitFlash] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);

  const nextIdRef = useRef(0);
  const nextPopupIdRef = useRef(0);
  const nextMilestoneToastIdRef = useRef(0);
  const nextParticleIdRef = useRef(0);
  const processedHitsRef = useRef<Set<number>>(new Set());
  const molesListRef = useRef<Mole[]>([]);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moleTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const uiTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const bestBeforeGameRef = useRef(0);

  const config = DIFFICULTY_CONFIG[difficulty];

  const clearGameLoop = useCallback(() => {
    if (!gameLoopRef.current) return;
    clearInterval(gameLoopRef.current);
    gameLoopRef.current = null;
  }, []);

  const clearSpawnLoop = useCallback(() => {
    if (!spawnRef.current) return;
    clearInterval(spawnRef.current);
    spawnRef.current = null;
  }, []);

  const clearUiTimers = useCallback(() => {
    uiTimersRef.current.forEach((timer) => clearTimeout(timer));
    uiTimersRef.current.clear();
  }, []);

  const addUiTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      uiTimersRef.current.delete(timer);
      callback();
    }, delay);

    uiTimersRef.current.add(timer);
    return timer;
  }, []);

  const clearMoleTimerRefs = useCallback(() => {
    moleTimersRef.current.forEach((timer) => clearTimeout(timer));
    moleTimersRef.current.clear();
    processedHitsRef.current.clear();
  }, []);

  const clearMoleTimers = useCallback(
    (removeMoles = true) => {
      clearMoleTimerRefs();

      if (removeMoles) {
        molesListRef.current = [];
        setMoles([]);
      }
    },
    [clearMoleTimerRefs],
  );

  const clearRuntime = useCallback(
    (clearVisualEffects = false) => {
      clearGameLoop();
      clearSpawnLoop();
      clearMoleTimers(true);

      if (clearVisualEffects) {
        clearUiTimers();
        setPopups([]);
        setMilestoneToast(null);
        setParticles([]);
        setHitFlash(null);
        setShakeScreen(false);
      }
    },
    [clearGameLoop, clearMoleTimers, clearSpawnLoop, clearUiTimers],
  );

  const removeMoleById = useCallback((id: number) => {
    const next = molesListRef.current.filter((mole) => mole.id !== id);
    molesListRef.current = next;
    processedHitsRef.current.delete(id);
    setMoles(next);
  }, []);

  const markMoleAsHit = useCallback((id: number) => {
    const next = molesListRef.current.map((mole) =>
      mole.id === id ? { ...mole, hit: true } : mole,
    );
    molesListRef.current = next;
    setMoles(next);
  }, []);

  // Countdown sequence. Opening /game directly stays idle until the player taps START.
  useEffect(() => {
    if (gameStatus !== 'countdown') return;

    clearGameLoop();
    clearSpawnLoop();
    clearMoleTimerRefs();
    clearUiTimers();
    molesListRef.current = [];

    queueMicrotask(() => {
      setMoles([]);
      setPopups([]);
      setParticles([]);
      setHitFlash(null);
      setShakeScreen(false);
      setCountdownNum(3);
      setIsNewBest(false);
      resetOnlineSave();
    });

    playGameSound(soundEnabled, 'countdown');
    bestBeforeGameRef.current = useGameStore.getState().highScoreByDifficulty[difficulty] ?? 0;

    let index = 0;
    let goTimer: ReturnType<typeof setTimeout> | null = null;

    const countdownInterval = setInterval(() => {
      index += 1;

      if (index >= COUNTDOWN_STEPS.length) {
        clearInterval(countdownInterval);
        return;
      }

      const nextCount = COUNTDOWN_STEPS[index];
      setCountdownNum(nextCount);
      playGameSound(soundEnabled, nextCount === 0 ? 'start' : 'countdown');

      if (nextCount === 0) {
        goTimer = setTimeout(() => {
          if (useGameStore.getState().gameStatus === 'countdown') {
            beginPlay();
          }
        }, 600);
      }
    }, 800);

    return () => {
      clearInterval(countdownInterval);
      if (goTimer) clearTimeout(goTimer);
    };
  }, [
    beginPlay,
    clearGameLoop,
    clearMoleTimerRefs,
    clearSpawnLoop,
    clearUiTimers,
    difficulty,
    gameStatus,
    language,
    resetOnlineSave,
    soundEnabled,
  ]);

  // The active play loop is allowed to run only while the store is in "playing".
  useEffect(() => {
    if (gameStatus !== 'playing') return;

    clearGameLoop();
    gameLoopRef.current = setInterval(() => {
      tick();
    }, 1000);

    return clearGameLoop;
  }, [clearGameLoop, gameStatus, tick]);

  // Any non-playing state must stop runtime timers immediately. Existing moles are removed
  // without calling missHit(), so pause/gameover cannot silently alter score or accuracy.
  useEffect(() => {
    if (gameStatus === 'playing') return;

    clearGameLoop();
    clearSpawnLoop();

    if (gameStatus === 'paused' || gameStatus === 'gameover' || gameStatus === 'idle') {
      clearMoleTimerRefs();
      molesListRef.current = [];
      queueMicrotask(() => setMoles([]));
    }
  }, [clearGameLoop, clearMoleTimerRefs, clearSpawnLoop, gameStatus]);

  // New-best display is based on the best score captured before this run started.
  useEffect(() => {
    if (gameStatus === 'gameover') {
      setIsNewBest(score > bestBeforeGameRef.current);
      playGameSound(soundEnabled, 'gameOver');
    }
  }, [gameStatus, score, soundEnabled]);

  useEffect(() => {
    syncBackgroundMusic(musicEnabled, gameStatus === 'playing');

    return () => syncBackgroundMusic(false, false);
  }, [gameStatus, musicEnabled]);

  // Cleanup all timers on unmount.
  useEffect(() => {
    return () => {
      clearRuntime(true);
    };
  }, [clearRuntime]);

  const spawnMole = useCallback(() => {
    if (useGameStore.getState().gameStatus !== 'playing') return;

    setMoles((prev) => {
      const occupied = new Set(
        prev.filter((mole) => mole.visible && !mole.hit).map((mole) => mole.index),
      );
      const available = GRID_INDEXES.filter((index) => !occupied.has(index));

      if (available.length === 0) return prev;

      const index = available[Math.floor(Math.random() * available.length)];
      const roll = Math.random();
      const type: MoleType =
        roll < config.goldenChance
          ? 'golden'
          : roll < config.goldenChance + config.angryChance
            ? 'angry'
            : 'normal';

      const id = nextIdRef.current++;
      const newMole: Mole = { id, index, type, visible: true, hit: false };

      const timer = setTimeout(() => {
        moleTimersRef.current.delete(id);

        const current = molesListRef.current.find((mole) => mole.id === id);
        const isStillPlayable = useGameStore.getState().gameStatus === 'playing';

        if (
          current &&
          current.visible &&
          !current.hit &&
          isStillPlayable &&
          isFriendlyMole(current.type)
        ) {
          const state = useGameStore.getState();
          state.missHit();
          playGameSound(state.soundEnabled, 'miss');
        }

        removeMoleById(id);
      }, config.visibleDuration);

      moleTimersRef.current.set(id, timer);

      const next = [...prev, newMole];
      molesListRef.current = next;
      return next;
    });
  }, [config.angryChance, config.goldenChance, config.visibleDuration, removeMoleById]);

  // Mole spawning.
  useEffect(() => {
    if (gameStatus !== 'playing') return;

    clearSpawnLoop();
    spawnMole();
    spawnRef.current = setInterval(spawnMole, config.spawnInterval);

    return clearSpawnLoop;
  }, [clearSpawnLoop, config.spawnInterval, gameStatus, spawnMole]);

  const handleHitMole = useCallback(
    (moleId: number) => {
      if (useGameStore.getState().gameStatus !== 'playing') return;
      if (processedHitsRef.current.has(moleId)) return;

      const mole = molesListRef.current.find((item) => item.id === moleId);
      if (!mole || mole.hit || !mole.visible) return;

      processedHitsRef.current.add(mole.id);

      const timer = moleTimersRef.current.get(mole.id);
      if (timer) {
        clearTimeout(timer);
        moleTimersRef.current.delete(mole.id);
      }

      const beforeHit = useGameStore.getState();
      const result = calculateHitResult(beforeHit, mole.type);

      markMoleAsHit(mole.id);
      addUiTimeout(() => removeMoleById(mole.id), 220);

      hitMole(mole.type);

      if (mole.type === 'angry') {
        playGameSound(soundEnabled, 'angryHit');
      } else if (
        result.timeBonus > 0 ||
        result.leveledUp ||
        result.nextCombo === 3 ||
        result.nextCombo === 6 ||
        result.nextCombo === 10
      ) {
        playGameSound(soundEnabled, 'combo');
      } else if (mole.type === 'golden') {
        playGameSound(soundEnabled, 'goldenHit');
      } else {
        playGameSound(soundEnabled, 'normalHit');
      }

      if (result.timeBonus > 0 || result.leveledUp) {
        const toastId = nextMilestoneToastIdRef.current++;
        setMilestoneToast({
          id: toastId,
          combo: result.nextCombo,
          timeBonus: result.timeBonus,
          level: result.nextLevel,
          levelMultiplier: result.nextLevelMultiplier,
          leveledUp: result.leveledUp,
        });
        addUiTimeout(() => {
          setMilestoneToast((currentToast) => (currentToast?.id === toastId ? null : currentToast));
        }, 1250);
      }

      const holeEl = document.getElementById(`hole-${mole.index}`);
      if (!holeEl) return;

      const rect = holeEl.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top;

      const popupId = nextPopupIdRef.current++;
      setPopups((prev) => [
        ...prev,
        {
          id: popupId,
          x,
          y,
          points: result.points,
          type: mole.type,
          combo: result.nextCombo >= 3 ? result.nextCombo : undefined,
          levelMultiplier: result.nextLevelMultiplier,
        },
      ]);
      addUiTimeout(() => {
        setPopups((prev) => prev.filter((popup) => popup.id !== popupId));
      }, 1000);

      const colors =
        mole.type === 'normal'
          ? ['#F06292', '#F48FB1', '#F8BBD0']
          : mole.type === 'angry'
            ? ['#E53935', '#EF5350', '#E57373']
            : ['#FFD700', '#FFD54F', '#FFE082'];

      const newParticles = Array.from({ length: 5 }, (_, index) => ({
        id: nextParticleIdRef.current++,
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 20,
        color: colors[index % colors.length],
        tx: `${(Math.random() - 0.5) * 60 - 50}%`,
        ty: `${(Math.random() - 0.5) * 60 - 50}%`,
      }));

      setParticles((prev) => [...prev, ...newParticles]);
      addUiTimeout(() => {
        const particleIds = new Set(newParticles.map((particle) => particle.id));
        setParticles((prev) => prev.filter((particle) => !particleIds.has(particle.id)));
      }, 600);

      setHitFlash(mole.index);
      addUiTimeout(() => setHitFlash(null), 80);

      if (mole.type === 'angry') {
        setShakeScreen(true);
        addUiTimeout(() => setShakeScreen(false), 300);
      }
    },
    [addUiTimeout, hitMole, markMoleAsHit, removeMoleById, soundEnabled],
  );

  const handleMoleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, moleId: number) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();
      handleHitMole(moleId);
    },
    [handleHitMole],
  );

  const handleStart = useCallback(() => {
    unlockAudio();
    playGameSound(soundEnabled, 'start');
    startGame();
  }, [soundEnabled, startGame]);

  const handlePauseToggle = useCallback(() => {
    unlockAudio();

    if (gameStatus === 'playing') {
      playGameSound(soundEnabled, 'pause');
      pauseGame();
      return;
    }

    if (gameStatus === 'paused') {
      playGameSound(soundEnabled, 'resume');
      resumeGame();
    }
  }, [gameStatus, pauseGame, resumeGame, soundEnabled]);

  const handleResume = useCallback(() => {
    unlockAudio();
    playGameSound(soundEnabled, 'resume');
    resumeGame();
  }, [resumeGame, soundEnabled]);

  const handleQuitToHome = useCallback(() => {
    playGameSound(soundEnabled, 'menu');
    clearRuntime(true);
    useGameStore.getState().resetGame();
    navigate('/');
  }, [clearRuntime, navigate, soundEnabled]);

  const handlePlayAgain = useCallback(() => {
    unlockAudio();
    playGameSound(soundEnabled, 'start');
    clearRuntime(true);
    resetOnlineSave();
    startGame();
  }, [clearRuntime, resetOnlineSave, soundEnabled, startGame]);

  const starRating = gameStatus === 'gameover' ? getStarRating(score, difficulty) : 0;
  const accuracy = getAccuracyPercent(goodHits, badHits, missedFriendly);

  const totalTime = config.gameDuration;
  const timerProgress = Math.min(1, Math.max(0, timeLeft / totalTime));
  const comboToNextTimeBonus = TIME_BONUS_COMBO_INTERVAL - (combo % TIME_BONUS_COMBO_INTERVAL || 0);
  const comboProgressSteps =
    combo === 0 ? 0 : combo % TIME_BONUS_COMBO_INTERVAL || TIME_BONUS_COMBO_INTERVAL;
  const nextBonusCombo = combo + comboToNextTimeBonus;
  const timeBonusFeedback =
    milestoneToast && milestoneToast.timeBonus > 0
      ? `+${milestoneToast.timeBonus}${t(language, 'secondsUnit')}`
      : null;
  const levelUpFeedback =
    milestoneToast && milestoneToast.leveledUp ? `Lv.${milestoneToast.level}` : null;
  const playLevel = getPlayLevelInfo(maxCombo);
  const comboMultiplier = getComboMultiplier(combo);
  const totalScoreMultiplier = comboMultiplier * playLevel.multiplier;
  const displayScoreMultiplier = formatMultiplier(totalScoreMultiplier);
  const isTimeWarning = timeLeft <= 10;
  const isTimeDanger = timeLeft <= 5;
  const timerCircumference = 2 * Math.PI * 46;
  const timerStrokeOffset = timerCircumference * (1 - timerProgress);
  const timerAccentColor = isTimeDanger ? '#E53935' : isTimeWarning ? '#F57C00' : '#F57C00';
  const timeBonusLabel = `+${TIME_BONUS_SECONDS}${t(language, 'secondsUnit')}`;
  const multiplierLabel = language === 'ja' ? '倍率' : t(language, 'scoreMultiplier');
  const nextBonusLabel =
    language === 'ja'
      ? `次のボーナス：${nextBonusCombo}コンボ`
      : `Next bonus: ${nextBonusCombo} combo`;

  return (
    <div
      className={`game-stage-offset relative isolate flex h-full min-h-0 flex-col overflow-hidden ${shakeScreen ? 'animate-shake' : ''}`}
    >
      {/* Lightweight game background: flat sky + quiet field, so the PNG sprites stay readable */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#8EDDFC]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#63C7F5_0%,#BDEFFF_34%,#FFF8E1_52%,#FFF8E1_68%,#D7ED8A_79%,#8CCB5C_100%)]" />
        <div className="absolute left-[-10%] top-[12%] h-9 w-28 rounded-full bg-white/55 blur-[1px]" />
        <div className="absolute right-[8%] top-[18%] h-8 w-24 rounded-full bg-white/45 blur-[1px]" />
        <div className="absolute left-[14%] top-[28%] h-5 w-16 rounded-full bg-white/35 blur-[1px]" />
        <div className="absolute bottom-[19%] left-[-16%] h-28 w-[66%] rounded-[50%] bg-[#B6DE72]/45" />
        <div className="absolute bottom-[17%] right-[-20%] h-32 w-[74%] rounded-[50%] bg-[#93CF60]/38" />
        <div className="absolute bottom-0 left-0 h-[18%] w-full bg-[linear-gradient(180deg,rgba(142,203,92,0)_0%,rgba(110,181,78,0.45)_100%)]" />
      </div>

      {/* Selected HUD direction: circular remaining-time meter, side score/combo cards, single rule bar */}
      <div className="relative z-40 px-3 pt-0">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(112px,0.92fr)_minmax(0,1fr)] items-center gap-2">
          <div className="relative flex min-h-[74px] min-w-0 flex-col justify-center overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/85 px-3 py-2 shadow-[0_7px_18px_rgba(93,64,55,0.13)] backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-accent-pink/20" />
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.11em] text-text-dark/85">
              <span className="text-accent-pink">♛</span>
              <span>{t(language, 'scoreLabel')}</span>
            </div>
            <span
              className="mt-1 truncate font-display text-[clamp(2rem,8.5vw,2.75rem)] leading-none text-accent-pink tabular-nums"
              style={{ textShadow: '0 1px 0 rgba(255,255,255,0.9)' }}
            >
              {score.toLocaleString()}
            </span>
          </div>

          <motion.div
            className="relative mx-auto flex h-[118px] w-[118px] shrink-0 items-center justify-center rounded-full bg-white shadow-[0_8px_22px_rgba(93,64,55,0.16)]"
            animate={timeBonusFeedback ? { scale: [1, 1.035, 1] } : { scale: 1 }}
            transition={{ duration: 0.38, ease: 'easeOut' }}
          >
            <svg
              className="absolute inset-0 h-full w-full -rotate-90"
              viewBox="0 0 108 108"
              aria-hidden="true"
            >
              <circle
                cx="54"
                cy="54"
                r="46"
                fill="none"
                stroke="rgba(247,183,92,0.28)"
                strokeWidth="7"
              />
              <circle
                cx="54"
                cy="54"
                r="46"
                fill="none"
                stroke={timerAccentColor}
                strokeLinecap="round"
                strokeWidth="7"
                strokeDasharray={timerCircumference}
                strokeDashoffset={timerStrokeOffset}
                className="transition-[stroke-dashoffset,stroke] duration-700"
              />
            </svg>
            <div className="relative flex flex-col items-center text-center">
              <span className="text-[11px] font-black tracking-[0.08em] text-text-dark/90">
                {t(language, 'timeLabel')}
              </span>
              <span
                className={`font-display text-[3.75rem] leading-[0.86] tabular-nums ${
                  isTimeDanger ? 'text-accent-red' : 'text-accent-orange'
                }`}
                style={{ textShadow: '0 2px 0 rgba(255,255,255,0.95)' }}
              >
                {timeLeft}
              </span>
              <span className="mt-1 text-sm font-black text-accent-orange">
                {t(language, 'secondsUnit')}
              </span>
            </div>
            <AnimatePresence>
              {timeBonusFeedback && gameStatus === 'playing' && (
                <motion.span
                  key={`time-bonus-${milestoneToast?.id}`}
                  className="pointer-events-none absolute -right-2 top-2 rounded-full bg-accent-pink px-2.5 py-1 text-[11px] font-black leading-none text-white shadow-[0_5px_14px_rgba(233,30,99,0.28)]"
                  initial={{ opacity: 0, y: 4, scale: 0.7 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.9 }}
                  transition={{ duration: 0.25 }}
                >
                  {timeBonusFeedback}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          <div className="relative flex min-h-[74px] min-w-0 flex-col justify-center overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/85 px-3 py-2 text-center shadow-[0_7px_18px_rgba(93,64,55,0.13)] backdrop-blur-sm">
            <span className="text-[10px] font-extrabold tracking-[0.11em] text-text-dark/85">
              {t(language, 'comboLabel')}
            </span>
            <span
              className="mt-0.5 font-display text-[clamp(2.1rem,8vw,2.8rem)] leading-none text-accent-orange tabular-nums"
              style={{ textShadow: '0 1px 0 rgba(255,255,255,0.9)' }}
            >
              {combo}
            </span>
            <span className="mt-1 text-sm font-black text-accent-pink">{timeBonusLabel}</span>
          </div>
        </div>

        <div className="mt-2 flex min-h-[58px] items-center rounded-[1.35rem] border border-white/80 bg-white/85 px-3 py-2 shadow-[0_7px_18px_rgba(93,64,55,0.12)] backdrop-blur-sm">
          <div className="flex min-w-[68px] flex-1 items-center gap-2">
            <span className="text-lg leading-none text-grass-dark">⚑</span>
            <div className="min-w-0">
              <div className="text-[10px] font-black tracking-[0.08em] text-text-dark/80">
                {t(language, 'levelLabel')}
              </div>
              <div className="font-display text-[1.45rem] leading-none text-grass-dark">
                Lv.{playLevel.level}
              </div>
            </div>
          </div>

          <div className="mx-2 h-9 w-px bg-soil-light/35" />

          <motion.div
            className="relative flex min-w-[68px] flex-1 flex-col items-center justify-center text-center"
            animate={levelUpFeedback ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="text-[10px] font-black tracking-[0.08em] text-text-dark/80">
              {multiplierLabel}
            </div>
            <div className="font-display text-[1.25rem] leading-none text-text-dark tabular-nums">
              x{displayScoreMultiplier}
            </div>
            <AnimatePresence>
              {levelUpFeedback && gameStatus === 'playing' && (
                <motion.span
                  key={`level-up-${milestoneToast?.id}`}
                  className="pointer-events-none absolute -right-1 -top-2 rounded-full bg-grass-mid px-2 py-1 text-[10px] font-black leading-none text-white shadow-[0_5px_14px_rgba(76,175,80,0.24)]"
                  initial={{ opacity: 0, y: 4, scale: 0.72 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.9 }}
                  transition={{ duration: 0.25 }}
                >
                  {levelUpFeedback}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          <div className="mx-2 h-9 w-px bg-soil-light/35" />

          <div className="min-w-0 flex-[1.55]">
            <div className="truncate text-[10px] font-black tracking-[0.02em] text-text-dark">
              {nextBonusLabel}
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              {Array.from({ length: TIME_BONUS_COMBO_INTERVAL }, (_, index) => (
                <span
                  key={index}
                  className={`h-2.5 flex-1 rounded-full transition-colors duration-300 ${
                    index < comboProgressSteps ? 'bg-accent-gold' : 'bg-soil-light/35'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label={gameStatus === 'paused' ? t(language, 'resume') : t(language, 'pauseGame')}
          onClick={handlePauseToggle}
          className="absolute right-3 top-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/85 bg-white/85 shadow-[0_5px_14px_rgba(93,64,55,0.14)] backdrop-blur-sm transition-transform active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-pink/40"
        >
          {gameStatus === 'paused' ? (
            <Play size={16} className="text-text-dark ml-0.5" />
          ) : (
            <Pause size={16} className="text-text-dark" />
          )}
        </button>
      </div>

      {/* 3x3 Grid of production PNG holes */}
      <div className="relative z-10 flex min-h-0 flex-1 translate-y-8 items-center justify-center px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="grid aspect-square w-full max-w-[370px] grid-cols-3 gap-2.5 sm:gap-3">
          {GRID_INDEXES.map((idx) => (
            <div
              key={idx}
              id={`hole-${idx}`}
              className="relative flex items-center justify-center rounded-[38%]"
            >
              <img
                src={GAME_IMAGE_ASSETS.hole}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain drop-shadow-[0_7px_10px_rgba(62,39,35,0.18)]"
                draggable={false}
                decoding="async"
                loading="eager"
              />

              {hitFlash === idx && (
                <motion.div
                  className="pointer-events-none absolute inset-[12%] z-30 rounded-full bg-white/60"
                  initial={{ opacity: 1, scale: 0.8 }}
                  animate={{ opacity: 0, scale: 1.15 }}
                  transition={{ duration: 0.12 }}
                />
              )}

              {/* Mole popup layer. The hit state stays visible briefly, then exits into the hole. */}
              <div className="absolute inset-0 z-10 overflow-hidden rounded-[42%]">
                <AnimatePresence>
                  {moles
                    .filter((mole) => mole.index === idx && mole.visible)
                    .map((mole) => (
                      <motion.div
                        key={mole.id}
                        role="button"
                        tabIndex={0}
                        aria-label={
                          mole.type === 'angry'
                            ? 'Avoid mischievous trap mole'
                            : `Hit ${mole.type} mole`
                        }
                        className="absolute inset-x-[-6%] bottom-[10%] flex h-[90%] cursor-pointer select-none items-end justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-grass-mid"
                        style={{ touchAction: 'manipulation' }}
                        initial={{ y: '78%', scale: 0.96 }}
                        animate={{
                          y: mole.hit ? '4%' : '0%',
                          scale: mole.hit ? 0.98 : 1,
                          rotate: mole.hit && mole.type === 'angry' ? -3 : 0,
                        }}
                        exit={{ y: '82%', scale: 0.94 }}
                        transition={
                          mole.hit
                            ? { duration: 0.12 }
                            : { type: 'spring', stiffness: 430, damping: 19 }
                        }
                        onPointerDown={(event) => {
                          event.preventDefault();
                          handleHitMole(mole.id);
                        }}
                        onKeyDown={(event) => handleMoleKeyDown(event, mole.id)}
                      >
                        <MoleSprite
                          type={mole.type}
                          hit={mole.hit}
                          className="pointer-events-none h-full w-full object-contain drop-shadow-[0_5px_5px_rgba(62,39,35,0.25)]"
                        />
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestone feedback stays inside the compact HUD so the gameplay field is never blocked. */}

      {/* Score popups */}
      <AnimatePresence>
        {popups.map((popup) => (
          <motion.div
            key={popup.id}
            className="fixed z-50 pointer-events-none font-display text-lg font-bold"
            style={{
              left: popup.x,
              top: popup.y,
              color:
                popup.type === 'angry'
                  ? '#E53935'
                  : popup.type === 'golden'
                    ? '#FFD700'
                    : '#F06292',
              textShadow: '0 0 12px rgba(0,0,0,0.5)',
            }}
            initial={{ opacity: 1, y: 0, scale: 0.5, x: '-50%' }}
            animate={{ opacity: 1, y: -20, scale: 1.2, x: '-50%' }}
            exit={{ opacity: 0, y: -60, x: '-50%' }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            {popup.points > 0 ? `+${popup.points}` : popup.points}
            {popup.combo && popup.combo >= 3 && (
              <span className="text-accent-orange text-sm ml-1">
                x{formatMultiplier(getComboMultiplier(popup.combo) * (popup.levelMultiplier ?? 1))}
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Particles */}
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="fixed w-2.5 h-2.5 rounded-full z-50 pointer-events-none"
            style={{ backgroundColor: particle.color, left: particle.x, top: particle.y }}
            initial={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            animate={{
              opacity: 0,
              scale: 0.3,
              x: particle.tx,
              y: particle.ty,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        ))}
      </AnimatePresence>

      {/* Countdown overlay */}
      <AnimatePresence>
        {gameStatus === 'countdown' && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-white/25 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={countdownNum}
                className="font-display text-8xl text-accent-pink"
                style={{
                  textShadow: '0 3px 0 rgba(255,255,255,0.9), 0 8px 18px rgba(93,64,55,0.25)',
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              >
                {countdownNum === 0 ? 'GO!' : countdownNum}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Idle overlay - TAP TO START */}
      <AnimatePresence>
        {gameStatus === 'idle' && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-transparent px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={handleStart}
          >
            <motion.button
              type="button"
              className="rounded-full bg-white/85 px-8 py-4 text-center font-display text-2xl text-text-dark shadow-[0_5px_0_rgba(93,64,55,0.22),0_12px_24px_rgba(93,64,55,0.18)] backdrop-blur-sm"
              style={{ textShadow: '0 1px 0 rgba(255,255,255,0.9)' }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={handleStart}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
            >
              {t(language, 'tapToStart')}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause overlay */}
      <AnimatePresence>
        {gameStatus === 'paused' && (
          <motion.div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-text-dark/70 backdrop-blur-sm px-6 py-6 safe-top safe-bottom"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-bg-cream rounded-3xl p-8 w-[80%] max-w-[300px] flex flex-col items-center gap-4 shadow-game"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <h2 className="font-display text-3xl text-text-dark">{t(language, 'paused')}</h2>
              <p className="text-text-light text-sm">
                {t(language, 'scoreLabel')}: {score.toLocaleString()}
              </p>
              <button
                type="button"
                onClick={handleResume}
                className="w-full h-12 rounded-full bg-accent-pink text-white font-display text-lg shadow-btn-pink active:shadow-btn-pink-pressed active:translate-y-1 transition-all"
              >
                <div className="flex items-center justify-center gap-2">
                  <Play size={20} />
                  <span>{t(language, 'resume')}</span>
                </div>
              </button>
              <button
                type="button"
                onClick={handleQuitToHome}
                className="w-full h-12 rounded-full bg-white text-text-dark font-bold border-2 border-soil-light active:translate-y-1 transition-all"
              >
                <div className="flex items-center justify-center gap-2">
                  <Home size={18} />
                  <span>{t(language, 'quit')}</span>
                </div>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over overlay */}
      <AnimatePresence>
        {gameStatus === 'gameover' && (
          <motion.div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-text-dark/70 backdrop-blur-sm px-6 py-6 safe-top safe-bottom overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-bg-cream rounded-3xl p-6 w-full max-w-[340px] flex flex-col items-center gap-3 shadow-game my-auto"
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              {/* New Best badge */}
              {isNewBest && (
                <motion.div
                  className="bg-accent-gold text-text-dark text-xs font-extrabold px-4 py-1 rounded-full uppercase tracking-wider"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 500 }}
                >
                  <span className="animate-pulse">{t(language, 'newBest')}</span>
                </motion.div>
              )}

              <h2 className="font-display text-3xl text-text-dark">{t(language, 'gameOver')}</h2>

              {/* Final score */}
              <motion.span
                className="font-display text-5xl text-accent-pink"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              >
                {score.toLocaleString()}
              </motion.span>

              {/* Star rating */}
              <div className="flex gap-1.5 mb-1">
                {[1, 2, 3].map((star, index) => (
                  <motion.div
                    key={star}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.1, type: 'spring', stiffness: 400 }}
                  >
                    {star <= starRating ? (
                      <StarFilled className="w-8 h-8" />
                    ) : (
                      <StarEmpty className="w-8 h-8" />
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2 w-full mb-2">
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-[10px] text-text-light uppercase font-bold">
                    {t(language, 'maxCombo')}
                  </p>
                  <p className="font-display text-xl text-accent-orange">{maxCombo}</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-[10px] text-text-light uppercase font-bold">
                    {t(language, 'accuracy')}
                  </p>
                  <p className="font-display text-xl text-grass-mid">{accuracy}%</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-[10px] text-text-light uppercase font-bold">
                    {t(language, 'levelLabel')}
                  </p>
                  <p className="font-display text-lg text-grass-dark">Lv.{playLevel.level}</p>
                  <p className="text-[10px] font-black text-text-light">
                    x{playLevel.multiplier.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-[10px] text-text-light uppercase font-bold">
                    {t(language, 'hits')}
                  </p>
                  <p className="font-display text-lg text-text-dark">{goodHits}</p>
                </div>
              </div>

              {/* Online save */}
              <div className="w-full rounded-2xl bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-text-light">
                      {t(language, 'onlineRanking')}
                    </p>
                    <p className="truncate text-sm font-bold text-text-dark">
                      {authUser && authProfile
                        ? authProfile.nickname
                        : authUser
                          ? t(language, 'nicknameRequired')
                          : t(language, 'saveRequiresLogin')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveOnline()}
                    disabled={onlineSaveStatus === 'saving' || onlineSaveStatus === 'saved'}
                    className={`flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-extrabold text-white shadow-sm disabled:opacity-70 ${
                      authUser ? 'bg-grass-mid' : 'bg-accent-pink'
                    }`}
                  >
                    {authUser ? <Cloud size={15} /> : <LogIn size={15} />}
                    <span>
                      {onlineSaveStatus === 'saving'
                        ? t(language, 'saving')
                        : authUser
                          ? t(language, 'saveOnline')
                          : t(language, 'signInAndSave')}
                    </span>
                  </button>
                </div>
                {onlineSaveMessage && (
                  <p
                    className={`text-xs font-semibold ${
                      onlineSaveStatus === 'error' ? 'text-accent-red' : 'text-grass-dark'
                    }`}
                  >
                    {onlineSaveMessage}
                  </p>
                )}
              </div>

              {/* Buttons */}
              <button
                type="button"
                onClick={handlePlayAgain}
                className="w-full h-12 rounded-full bg-accent-pink text-white font-display text-lg shadow-btn-pink active:shadow-btn-pink-pressed active:translate-y-1 transition-all"
              >
                <div className="flex items-center justify-center gap-2">
                  <RotateCcw size={18} />
                  <span>{t(language, 'playAgain')}</span>
                </div>
              </button>
              <button
                type="button"
                onClick={handleQuitToHome}
                className="w-full h-10 rounded-full bg-white text-text-dark font-bold border-2 border-soil-light active:translate-y-1 transition-all"
              >
                <div className="flex items-center justify-center gap-2">
                  <Home size={16} />
                  <span>{t(language, 'home')}</span>
                </div>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
