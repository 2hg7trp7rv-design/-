import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Play, Trash2, ChevronLeft, RefreshCw, Cloud, Smartphone } from 'lucide-react';
import { useGameStore, getStarRating, type Difficulty, type ScoreEntry } from '../store/gameStore';
import { StarFilled, StarEmpty } from '../components/assets';
import AuthStatusCard from '../components/AuthStatusCard';
import { playGameSound, unlockAudio } from '../lib/audio';
import { difficultyLabel, t } from '../lib/i18n';
import { fetchOnlineLeaderboard, type OnlineScoreEntry } from '../lib/leaderboard';
import { useAuthStore } from '../store/authStore';
import { useFocusTrap } from '../hooks/useFocusTrap';

type FilterType = 'all' | Difficulty;
type RankingMode = 'local' | 'online';

const medals = ['🥇', '🥈', '🥉'];

const difficultyColors: Record<Difficulty, string> = {
  easy: 'bg-grass-light',
  normal: 'bg-accent-orange',
  hard: 'bg-accent-red',
};

const difficulties: Difficulty[] = ['easy', 'normal', 'hard'];

function isDifficultyFilter(filter: FilterType): filter is Difficulty {
  return filter === 'easy' || filter === 'normal' || filter === 'hard';
}

function entryDateLabel(entry: ScoreEntry | OnlineScoreEntry): string {
  if ('updatedAtLabel' in entry) return entry.updatedAtLabel;
  return entry.date;
}

function entryPlayerLabel(entry: ScoreEntry | OnlineScoreEntry): string {
  if ('nickname' in entry) return entry.nickname;
  return 'You';
}

export default function Ranking() {
  const navigate = useNavigate();
  const {
    leaderboard,
    highScoreByDifficulty,
    difficulty: currentDifficulty,
    language,
    soundEnabled,
    clearLeaderboard,
    startGame,
  } = useGameStore();
  const isFirebaseConfigured = useAuthStore((state) => state.isConfigured);
  const authUser = useAuthStore((state) => state.user);
  const authProfile = useAuthStore((state) => state.profile);
  const [mode, setMode] = useState<RankingMode>('local');
  const [filter, setFilter] = useState<FilterType>('all');
  const [onlineScores, setOnlineScores] = useState<OnlineScoreEntry[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const clearDialogTitleId = useId();
  const clearDialogDescriptionId = useId();
  const clearDialogRef = useRef<HTMLDivElement>(null);
  const cancelClearButtonRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(clearDialogRef, showConfirm);

  const onlineDifficulty = isDifficultyFilter(filter) ? filter : currentDifficulty;

  useEffect(() => {
    if (!showConfirm) return undefined;

    cancelClearButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowConfirm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirm]);

  const loadOnlineScores = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setOnlineScores([]);
      setOnlineError(t(language, 'firebaseNotConfigured'));
      return;
    }

    setOnlineLoading(true);
    setOnlineError(null);

    try {
      const scores = await fetchOnlineLeaderboard(onlineDifficulty);
      setOnlineScores(scores);
    } catch (error) {
      setOnlineError(
        error instanceof Error ? error.message : t(language, 'onlineRankingUnavailable'),
      );
    } finally {
      setOnlineLoading(false);
    }
  }, [isFirebaseConfigured, language, onlineDifficulty]);

  useEffect(() => {
    if (mode !== 'online') return undefined;

    const timer = window.setTimeout(() => {
      void loadOnlineScores();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadOnlineScores, mode]);

  const handleBackToGame = () => {
    playGameSound(soundEnabled, 'menu');
    navigate('/game');
  };

  const handleModeChange = (nextMode: RankingMode) => {
    playGameSound(soundEnabled, 'menu');
    setMode(nextMode);
    if (nextMode === 'online' && filter === 'all') {
      setFilter(currentDifficulty);
    }
  };

  const handleFilterChange = (nextFilter: FilterType) => {
    playGameSound(soundEnabled, 'menu');
    setFilter(mode === 'online' && nextFilter === 'all' ? currentDifficulty : nextFilter);
  };

  const handlePlay = () => {
    unlockAudio();
    playGameSound(soundEnabled, 'start');
    startGame();
    navigate('/game');
  };

  const openClearConfirm = () => {
    playGameSound(soundEnabled, 'angryHit');
    setShowConfirm(true);
  };

  const confirmClear = () => {
    playGameSound(soundEnabled, 'gameOver');
    clearLeaderboard();
    setShowConfirm(false);
  };

  const filteredLeaderboard = leaderboard.filter((entry) => {
    if (filter === 'all') return true;
    return entry.difficulty === filter;
  });

  const localScores = filteredLeaderboard.slice(0, 10);
  const visibleScores = mode === 'online' ? onlineScores : localScores;

  const bestSummary = useMemo(() => {
    if (mode === 'online') {
      const myOnlineScore = onlineScores.find((entry) => entry.publicId === authProfile?.publicId);

      return {
        score: myOnlineScore?.score ?? 0,
        difficulty: onlineDifficulty,
        label: `${difficultyLabel(language, onlineDifficulty)} ${t(language, 'onlineRanking')}`,
      };
    }

    if (filter !== 'all') {
      return {
        score: highScoreByDifficulty[filter] ?? 0,
        difficulty: filter,
        label: `${difficultyLabel(language, filter)} ${t(language, 'best')}`,
      };
    }

    const bestDifficulty = difficulties.reduce<Difficulty>((best, difficulty) => {
      return (highScoreByDifficulty[difficulty] ?? 0) > (highScoreByDifficulty[best] ?? 0)
        ? difficulty
        : best;
    }, currentDifficulty);

    return {
      score: highScoreByDifficulty[bestDifficulty] ?? 0,
      difficulty: bestDifficulty,
      label: t(language, 'yourBest'),
    };
  }, [
    currentDifficulty,
    filter,
    highScoreByDifficulty,
    language,
    mode,
    onlineDifficulty,
    onlineScores,
    authProfile,
  ]);

  const bestSummaryDisplay = bestSummary.score > 0 ? bestSummary.score.toLocaleString() : '--';

  const getEntryStars = (entry: ScoreEntry | OnlineScoreEntry) => {
    return 'stars' in entry ? entry.stars : getStarRating(entry.score, entry.difficulty);
  };

  const filterLabel = (filterKey: FilterType) => {
    return filterKey === 'all' ? t(language, 'all') : difficultyLabel(language, filterKey);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg-cream">
      {/* Header */}
      <div className="page-top-offset flex items-center gap-2.5 px-3 pb-2">
        <button
          type="button"
          aria-label={t(language, 'backToGame')}
          onClick={handleBackToGame}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <ChevronLeft size={18} className="text-text-dark" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <Trophy size={24} className="text-accent-yellow" />
          <h1 className="truncate font-display text-2xl text-text-dark">
            {t(language, 'ranking')}
          </h1>
        </div>
      </div>

      {/* Mode switch */}
      <div className="mb-3 px-4">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-white p-1 shadow-sm">
          {(['local', 'online'] as const).map((modeKey) => (
            <button
              key={modeKey}
              type="button"
              aria-pressed={mode === modeKey}
              onClick={() => handleModeChange(modeKey)}
              className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-extrabold uppercase transition-all ${
                mode === modeKey ? 'bg-accent-pink text-white shadow-sm' : 'text-text-light'
              }`}
            >
              {modeKey === 'local' ? <Smartphone size={14} /> : <Cloud size={14} />}
              <span>
                {modeKey === 'local' ? t(language, 'localRanking') : t(language, 'onlineRanking')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {mode === 'online' && (
        <div className="mb-3 px-4">
          <AuthStatusCard compact />
        </div>
      )}

      {/* Personal Best Card */}
      <div className="mb-3 px-4">
        <motion.div
          className="rounded-2xl bg-white p-4 shadow-md"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-light">
                {bestSummary.label}
              </p>
              <p className="font-display text-4xl text-accent-pink">{bestSummaryDisplay}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-1">
                {[1, 2, 3].map((star) =>
                  star <= getStarRating(bestSummary.score, bestSummary.difficulty) ? (
                    <StarFilled key={star} className="h-5 w-5" />
                  ) : (
                    <StarEmpty key={star} className="h-5 w-5" />
                  ),
                )}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                  difficultyColors[bestSummary.difficulty]
                }`}
              >
                {difficultyLabel(language, bestSummary.difficulty)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-3 px-4">
        <div className="flex gap-1.5 rounded-full bg-white p-1 shadow-sm">
          {(['all', 'easy', 'normal', 'hard'] as const).map((filterKey) => {
            const disabled = mode === 'online' && filterKey === 'all';

            return (
              <button
                key={filterKey}
                type="button"
                aria-pressed={filter === filterKey}
                disabled={disabled}
                onClick={() => handleFilterChange(filterKey)}
                className={`flex-1 rounded-full py-1.5 text-xs font-bold uppercase transition-all disabled:opacity-40 ${
                  filter === filterKey
                    ? 'bg-accent-pink text-white shadow-sm'
                    : 'text-text-light hover:text-text-dark'
                }`}
              >
                {filterLabel(filterKey)}
              </button>
            );
          })}
        </div>
      </div>

      {mode === 'online' && (
        <div className="mb-2 flex items-center justify-between px-4">
          <p className="text-xs font-bold text-text-light">
            {t(language, 'onlineTop100')} · {difficultyLabel(language, onlineDifficulty)}
          </p>
          <button
            type="button"
            onClick={() => void loadOnlineScores()}
            disabled={onlineLoading}
            className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-text-dark shadow-sm disabled:opacity-60"
          >
            <RefreshCw size={13} className={onlineLoading ? 'animate-spin' : ''} />
            {t(language, 'refresh')}
          </button>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {mode === 'online' && onlineError && (
          <div className="mb-3 rounded-2xl border-2 border-accent-red/20 bg-white p-4 text-sm font-semibold text-accent-red">
            {onlineError}
          </div>
        )}

        {mode === 'online' && onlineLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw size={32} className="animate-spin text-accent-pink" />
            <p className="mt-3 text-sm font-bold text-text-light">{t(language, 'loading')}</p>
          </div>
        ) : visibleScores.length > 0 ? (
          <div className="space-y-2">
            {visibleScores.map((entry, index) => {
              const rank = index + 1;
              const stars = getEntryStars(entry);
              const isTop3 = rank <= 3;

              return (
                <motion.div
                  key={entry.id}
                  className={`flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ${
                    isTop3 ? 'border-l-4 border-l-accent-yellow' : ''
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                >
                  {/* Rank */}
                  <div className="w-8 flex-shrink-0 text-center">
                    {isTop3 ? (
                      <span className="text-xl">{medals[index]}</span>
                    ) : (
                      <span className="font-display text-lg text-text-light">#{rank}</span>
                    )}
                  </div>

                  {/* Score info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-xl text-text-dark">
                        {entry.score.toLocaleString()}
                      </p>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white ${
                          difficultyColors[entry.difficulty]
                        }`}
                      >
                        {difficultyLabel(language, entry.difficulty)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-text-light">
                      {mode === 'online'
                        ? entryPlayerLabel(entry)
                        : `${entryDateLabel(entry)} · ${t(language, 'maxCombo')}: ${
                            entry.maxCombo
                          }`}
                    </p>
                    {mode === 'online' && (
                      <p className="text-[10px] font-semibold text-text-light">
                        {t(language, 'maxCombo')}: {entry.maxCombo} · {t(language, 'accuracy')}:{' '}
                        {'accuracy' in entry ? entry.accuracy : 0}%
                      </p>
                    )}
                  </div>

                  {/* Stars */}
                  <div className="flex flex-shrink-0 gap-0.5">
                    {[1, 2, 3].map((star) =>
                      star <= stars ? (
                        <StarFilled key={star} className="h-4 w-4" />
                      ) : (
                        <StarEmpty key={star} className="h-4 w-4" />
                      ),
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy size={48} className="mb-3 text-text-light/30" />
            <p className="font-display text-xl text-text-light">
              {mode === 'online' ? t(language, 'noOnlineScoresYet') : t(language, 'noScoresYet')}
            </p>
            <button
              type="button"
              onClick={
                mode === 'online'
                  ? () => navigate(authUser && !authProfile ? '/nickname' : '/login')
                  : handlePlay
              }
              className="mt-4 flex items-center gap-2 rounded-full bg-accent-pink px-6 py-3 font-display text-white shadow-btn-pink transition-all active:translate-y-1 active:shadow-btn-pink-pressed"
            >
              <Play size={18} />
              <span>
                {mode === 'online'
                  ? t(language, authUser && !authProfile ? 'setNickname' : 'goToLogin')
                  : t(language, 'play')}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Clear button */}
      {mode === 'local' && leaderboard.length > 0 && (
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={openClearConfirm}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-accent-red/30 py-3 text-sm font-bold text-accent-red transition-colors hover:bg-red-50"
          >
            <Trash2 size={16} />
            {t(language, 'clearAllScores')}
          </button>
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-text-dark/50 px-6"
          role="presentation"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={clearDialogTitleId}
            aria-describedby={clearDialogDescriptionId}
            ref={clearDialogRef}
            className="flex w-full max-w-[300px] flex-col items-center gap-4 rounded-2xl bg-bg-cream p-6 shadow-game focus:outline-none"
            tabIndex={-1}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Trash2 size={32} className="text-accent-red" />
            <h3 id={clearDialogTitleId} className="font-display text-xl text-text-dark">
              {t(language, 'clearScoresTitle')}
            </h3>
            <p id={clearDialogDescriptionId} className="text-center text-sm text-text-light">
              {t(language, 'clearScoresDesc')}
            </p>
            <div className="flex gap-3">
              <button
                ref={cancelClearButtonRef}
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-full bg-white px-5 py-2 font-bold text-text-dark"
              >
                {t(language, 'cancel')}
              </button>
              <button
                type="button"
                onClick={confirmClear}
                className="rounded-full bg-accent-red px-5 py-2 font-bold text-white"
              >
                {t(language, 'clear')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
