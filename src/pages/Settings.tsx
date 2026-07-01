import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Settings,
  ChevronLeft,
  Volume2,
  VolumeX,
  Music,
  Pause,
  Smartphone,
  HelpCircle,
  RotateCcw,
  AlertTriangle,
  Heart,
  Languages,
} from 'lucide-react';
import { getAccuracyPercent, useGameStore } from '../store/gameStore';
import { Switch } from '../components/ui/switch';
import HowToPlayModal from '../components/HowToPlayModal';
import AuthStatusCard from '../components/AuthStatusCard';
import { playGameSound, stopBackgroundMusic, unlockAudio } from '../lib/audio';
import { difficultyLabel, t } from '../lib/i18n';
import { useFocusTrap } from '../hooks/useFocusTrap';

function SmartphoneOffIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span
      className={className}
      style={{ width: size, height: size, display: 'inline-flex', position: 'relative' }}
    >
      <Smartphone size={size} />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '2px',
          top: '50%',
          width: `${size - 4}px`,
          height: '2px',
          backgroundColor: 'currentColor',
          borderRadius: '999px',
          transform: 'rotate(-45deg)',
          transformOrigin: 'center',
        }}
      />
    </span>
  );
}

const difficulties = [
  {
    key: 'easy' as const,
    label: 'EASY',
    desc: 'Slow moles, more time',
    color: 'bg-grass-light',
    borderColor: 'border-grass-light',
  },
  {
    key: 'normal' as const,
    label: 'NORMAL',
    desc: 'Balanced gameplay',
    color: 'bg-accent-orange',
    borderColor: 'border-accent-orange',
  },
  {
    key: 'hard' as const,
    label: 'HARD',
    desc: 'Fast moles, challenging!',
    color: 'bg-accent-red',
    borderColor: 'border-accent-red',
  },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const {
    difficulty,
    soundEnabled,
    musicEnabled,
    vibrationEnabled,
    language,
    setDifficulty,
    toggleSound,
    toggleMusic,
    toggleVibration,
    setLanguage,
    totalGames,
    totalScore,
    cumulativeGoodHits,
    cumulativeBadHits,
    cumulativeMissedFriendly,
    clearAllData,
  } = useGameStore();

  const [showHowTo, setShowHowTo] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const resetDialogTitleId = useId();
  const resetDialogDescriptionId = useId();
  const resetDialogRef = useRef<HTMLDivElement>(null);
  const cancelResetButtonRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(resetDialogRef, showResetConfirm);

  useEffect(() => {
    if (!showResetConfirm) return undefined;

    cancelResetButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowResetConfirm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResetConfirm]);

  const handleDifficultyChange = (nextDifficulty: typeof difficulty) => {
    playGameSound(soundEnabled, 'menu');
    setDifficulty(nextDifficulty);
  };

  const handleSoundToggle = () => {
    unlockAudio();
    const willEnable = !soundEnabled;
    toggleSound();

    if (willEnable) {
      playGameSound(true, 'menu');
    }
  };

  const handleMusicToggle = () => {
    unlockAudio();
    const willEnable = !musicEnabled;
    toggleMusic();

    if (!willEnable) {
      stopBackgroundMusic();
    }
  };

  const handleVibrationToggle = () => {
    playGameSound(soundEnabled, 'menu');
    toggleVibration();
  };

  const handleLanguageChange = (nextLanguage: typeof language) => {
    unlockAudio();
    playGameSound(soundEnabled, 'menu');
    setLanguage(nextLanguage);
  };

  const openHowTo = () => {
    playGameSound(soundEnabled, 'menu');
    setShowHowTo(true);
  };

  const openResetConfirm = () => {
    playGameSound(soundEnabled, 'angryHit');
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    playGameSound(soundEnabled, 'gameOver');
    clearAllData();
    stopBackgroundMusic();
    setShowResetConfirm(false);
  };

  // Best combo from leaderboard
  const bestCombo = useGameStore((s) => {
    if (s.leaderboard.length === 0) return 0;
    return Math.max(...s.leaderboard.map((e) => e.maxCombo));
  });

  const accuracy = getAccuracyPercent(
    cumulativeGoodHits,
    cumulativeBadHits,
    cumulativeMissedFriendly,
  );

  return (
    <div className="h-full flex flex-col bg-bg-cream overflow-hidden">
      {/* Header */}
      <div className="page-top-offset flex items-center gap-2.5 px-3 pb-2">
        <button
          type="button"
          aria-label={t(language, 'goBack')}
          onClick={() => {
            playGameSound(soundEnabled, 'menu');
            navigate(-1);
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <ChevronLeft size={18} className="text-text-dark" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <Settings size={24} className="text-soil-mid" />
          <h1 className="truncate font-display text-2xl text-text-dark">
            {t(language, 'settings')}
          </h1>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {/* Difficulty Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h2 className="mb-2 mt-2 text-sm font-bold uppercase tracking-wider text-text-light">
            {t(language, 'difficulty')}
          </h2>
          <div className="grid grid-cols-3 gap-1.5">
            {difficulties.map((d) => (
              <button
                key={d.key}
                type="button"
                aria-pressed={difficulty === d.key}
                onClick={() => handleDifficultyChange(d.key)}
                className={`flex min-h-[78px] flex-col items-center justify-center gap-1 rounded-xl border-2 px-1.5 py-2.5 transition-all ${
                  difficulty === d.key
                    ? `${d.borderColor} bg-white shadow-md`
                    : 'border-transparent bg-white/60'
                }`}
              >
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold text-white ${d.color}`}
                >
                  {difficultyLabel(language, d.key)}
                </span>
                <span className="mt-1 text-center text-[10px] leading-tight text-text-light">
                  {d.key === 'easy'
                    ? t(language, 'easyDesc')
                    : d.key === 'normal'
                      ? t(language, 'normalDesc')
                      : t(language, 'hardDesc')}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Account */}
        <motion.div
          className="mt-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.075 }}
        >
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-text-light">
            {t(language, 'login')}
          </h2>
          <AuthStatusCard />
        </motion.div>

        {/* Sound & Music Toggles */}
        <motion.div
          className="mt-5 bg-white rounded-2xl p-4 shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-sm font-bold text-text-light uppercase tracking-wider mb-3">
            {t(language, 'audio')}
          </h2>
          <div className="space-y-3">
            {/* Sound */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {soundEnabled ? (
                  <Volume2 size={20} className="text-accent-pink" />
                ) : (
                  <VolumeX size={20} className="text-text-light" />
                )}
                <span className="text-sm font-semibold text-text-dark">
                  {t(language, 'soundEffects')}
                </span>
              </div>
              <Switch
                checked={soundEnabled}
                onCheckedChange={handleSoundToggle}
                className="data-[state=checked]:bg-accent-pink"
              />
            </div>
            {/* Music */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {musicEnabled ? (
                  <Music size={20} className="text-accent-pink" />
                ) : (
                  <Pause size={20} className="text-text-light" />
                )}
                <span className="text-sm font-semibold text-text-dark">{t(language, 'music')}</span>
              </div>
              <Switch
                checked={musicEnabled}
                onCheckedChange={handleMusicToggle}
                className="data-[state=checked]:bg-accent-pink"
              />
            </div>
          </div>
        </motion.div>

        {/* Language */}
        <motion.div
          className="mt-3 rounded-2xl bg-white p-4 shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.125 }}
        >
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-text-light">
            {t(language, 'language')}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {(['en', 'ja'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={language === option}
                onClick={() => handleLanguageChange(option)}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-extrabold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-pink/40 ${
                  language === option
                    ? 'border-accent-pink bg-accent-pink text-white shadow-md'
                    : 'border-transparent bg-bg-cream text-text-dark hover:bg-white'
                }`}
              >
                <Languages size={16} />
                <span>{option === 'en' ? t(language, 'english') : t(language, 'japanese')}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Vibration Toggle */}
        <motion.div
          className="mt-3 bg-white rounded-2xl p-4 shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {vibrationEnabled ? (
                <Smartphone size={20} className="text-accent-pink" />
              ) : (
                <SmartphoneOffIcon size={20} className="text-text-light" />
              )}
              <span className="text-sm font-semibold text-text-dark">
                {t(language, 'vibration')}
              </span>
            </div>
            <Switch
              checked={vibrationEnabled}
              onCheckedChange={handleVibrationToggle}
              className="data-[state=checked]:bg-accent-pink"
            />
          </div>
        </motion.div>

        {/* How to Play */}
        <motion.button
          className="mt-4 w-full flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm"
          type="button"
          onClick={openHowTo}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-3">
            <HelpCircle size={20} className="text-accent-cyan" />
            <span className="text-sm font-semibold text-text-dark">
              {t(language, 'howToPlayTitle')}
            </span>
          </div>
          <ChevronLeft size={18} className="text-text-light rotate-180" />
        </motion.button>

        {/* Stats */}
        <motion.div
          className="mt-4 bg-white rounded-2xl p-4 shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-sm font-bold text-text-light uppercase tracking-wider mb-3">
            {t(language, 'stats')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center py-2">
              <p className="text-[10px] text-text-light font-bold uppercase">
                {t(language, 'totalGames')}
              </p>
              <p className="font-display text-xl text-text-dark">{totalGames}</p>
            </div>
            <div className="text-center py-2">
              <p className="text-[10px] text-text-light font-bold uppercase">
                {t(language, 'totalScore')}
              </p>
              <p className="font-display text-xl text-accent-pink">{totalScore}</p>
            </div>
            <div className="text-center py-2">
              <p className="text-[10px] text-text-light font-bold uppercase">
                {t(language, 'bestCombo')}
              </p>
              <p className="font-display text-xl text-accent-orange">{bestCombo}x</p>
            </div>
            <div className="text-center py-2">
              <p className="text-[10px] text-text-light font-bold uppercase">
                {t(language, 'accuracy')}
              </p>
              <p className="font-display text-xl text-grass-mid">{accuracy}%</p>
            </div>
          </div>
        </motion.div>

        {/* Credits */}
        <motion.div
          className="mt-4 text-center py-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-xs text-text-light font-semibold">MoguMogu Smack v1.0</p>
          <p className="text-xs text-text-light/60 mt-0.5 flex items-center justify-center gap-1">
            Made with <Heart size={10} className="text-accent-red fill-accent-red" />
          </p>
        </motion.div>

        {/* Reset Data */}
        <motion.button
          className="mt-2 w-full py-3 rounded-xl border-2 border-accent-red/30 text-accent-red text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
          type="button"
          onClick={openResetConfirm}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          whileTap={{ scale: 0.98 }}
        >
          <RotateCcw size={14} />
          <span>{t(language, 'resetAllData')}</span>
        </motion.button>

        <div className="h-4" />
      </div>

      {/* How To Play Modal */}
      <HowToPlayModal isOpen={showHowTo} onClose={() => setShowHowTo(false)} />

      {/* Reset confirmation dialog */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-text-dark/50 px-6"
          role="presentation"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={resetDialogTitleId}
            aria-describedby={resetDialogDescriptionId}
            ref={resetDialogRef}
            className="bg-bg-cream rounded-2xl p-6 w-full max-w-[300px] flex flex-col items-center gap-4 shadow-game focus:outline-none"
            tabIndex={-1}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <AlertTriangle size={32} className="text-accent-red" />
            <h3 id={resetDialogTitleId} className="font-display text-xl text-text-dark">
              {t(language, 'resetAllDataTitle')}
            </h3>
            <p id={resetDialogDescriptionId} className="text-text-light text-sm text-center">
              {t(language, 'resetAllDataDesc')}
            </p>
            <div className="flex gap-3 w-full">
              <button
                ref={cancelResetButtonRef}
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-full bg-white text-text-dark font-bold border-2 border-soil-light focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-pink/40"
              >
                {t(language, 'cancel')}
              </button>
              <button
                type="button"
                onClick={confirmReset}
                className="flex-1 py-2.5 rounded-full bg-accent-red text-white font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-red/35"
              >
                {t(language, 'reset')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
