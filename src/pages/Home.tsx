import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, HelpCircle, Star } from 'lucide-react';
import { getStarRating, useGameStore } from '../store/gameStore';
import { playGameSound, unlockAudio } from '../lib/audio';
import { StarFilled, StarEmpty, GrassTuft } from '../components/assets';
import HowToPlayModal from '../components/HowToPlayModal';
import { difficultyLabel, t } from '../lib/i18n';
import { GAME_IMAGE_ASSETS } from '../lib/gameImageAssets';

const titleLetters = 'MOGUMOGU'.split('');
const subtitleLetters = 'SMACK!'.split('');

const difficulties = ['easy', 'normal', 'hard'] as const;

export default function Home() {
  const navigate = useNavigate();
  const { difficulty, highScore, language, soundEnabled, setDifficulty, startGame } =
    useGameStore();
  const [showHowTo, setShowHowTo] = useState(false);

  const handlePlay = () => {
    unlockAudio();
    playGameSound(soundEnabled, 'start');
    startGame();
    navigate('/game');
  };

  const handleDifficulty = (d: 'easy' | 'normal' | 'hard') => {
    playGameSound(soundEnabled, 'menu');
    setDifficulty(d);
  };

  const stars = getStarRating(highScore, difficulty);
  const highScoreDisplay = highScore > 0 ? highScore.toLocaleString() : '--';

  return (
    <div
      className="h-[100dvh] relative overflow-hidden flex flex-col items-center justify-center"
      style={{
        background:
          'linear-gradient(180deg, #4FC3F7 0%, #81D4FA 50%, #81D4FA 70%, #66BB6A 70%, #43A047 100%)',
      }}
    >
      {/* Floating clouds */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-[10%] left-0 opacity-60"
          animate={{ x: ['-120%', '120vw'] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        >
          <div className="w-24 h-10 bg-white/80 rounded-full" />
        </motion.div>
        <motion.div
          className="absolute top-[22%] left-0 opacity-40"
          animate={{ x: ['-120%', '120vw'] }}
          transition={{ duration: 35, repeat: Infinity, ease: 'linear', delay: 5 }}
        >
          <div className="w-16 h-7 bg-white/70 rounded-full" />
        </motion.div>
        <motion.div
          className="absolute top-[6%] left-0 opacity-50"
          animate={{ x: ['-120%', '120vw'] }}
          transition={{ duration: 32, repeat: Infinity, ease: 'linear', delay: 12 }}
        >
          <div className="w-20 h-8 bg-white/75 rounded-full" />
        </motion.div>
      </div>

      {/* Settings gear top-right */}
      <motion.button
        className="absolute top-5 right-5 z-10 w-11 h-11 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md"
        aria-label={t(language, 'openSettings')}
        onClick={() => {
          playGameSound(soundEnabled, 'menu');
          navigate('/settings');
        }}
        initial={{ opacity: 0, rotate: -90 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ delay: 0.6, type: 'spring' }}
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.95 }}
      >
        <Settings size={20} className="text-text-dark" />
      </motion.button>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-6 -mt-8">
        {/* Mascot */}
        <motion.div
          className="w-40 h-40 mb-2"
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: [0, -10, 0, -6, 0] }}
          transition={{
            opacity: { duration: 0.5 },
            scale: { duration: 0.5, type: 'spring', stiffness: 200 },
            y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
          }}
        >
          <img
            src={GAME_IMAGE_ASSETS.moles.normal}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain drop-shadow-xl"
            draggable={false}
            decoding="async"
            loading="eager"
          />
        </motion.div>

        {/* Title MOGUMOGU */}
        <div className="flex mb-0">
          {titleLetters.map((letter, i) => (
            <motion.span
              key={i}
              className="font-display text-[44px] text-white"
              style={{
                textShadow: '0 3px 0 #5D4037, 0 4px 8px rgba(0,0,0,0.3)',
                display: 'inline-block',
              }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.1 + i * 0.05,
                duration: 0.4,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              {letter}
            </motion.span>
          ))}
        </div>

        {/* Subtitle SMACK! */}
        <div className="flex -mt-1 mb-2">
          {subtitleLetters.map((letter, i) => (
            <motion.span
              key={i}
              className="font-display text-[36px] text-accent-yellow"
              style={{
                textShadow: '0 3px 0 #5D4037, 0 4px 8px rgba(0,0,0,0.3)',
                display: 'inline-block',
              }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.4 + i * 0.05,
                duration: 0.4,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              {letter}
            </motion.span>
          ))}
        </div>

        {/* Best Score */}
        <motion.div
          className="flex items-center gap-1.5 mb-6 bg-white/30 backdrop-blur-sm rounded-full px-4 py-1.5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Star size={16} className="text-accent-yellow fill-accent-yellow" />
          <span
            className="text-sm font-bold text-white"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            {t(language, 'best')}: {highScoreDisplay}
          </span>
          <div className="flex gap-0.5 ml-1">
            {[1, 2, 3].map((s) =>
              s <= stars ? (
                <StarFilled key={s} className="w-4 h-4" />
              ) : (
                <StarEmpty key={s} className="w-4 h-4" />
              ),
            )}
          </div>
        </motion.div>

        {/* Difficulty Selector */}
        <motion.div
          className="flex gap-2 mb-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          {difficulties.map((d) => (
            <button
              key={d}
              aria-pressed={difficulty === d}
              onClick={() => handleDifficulty(d)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                difficulty === d
                  ? 'bg-accent-pink text-white shadow-md'
                  : 'bg-white/60 text-text-dark hover:bg-white/80'
              }`}
            >
              {difficultyLabel(language, d)}
            </button>
          ))}
        </motion.div>

        {/* PLAY Button */}
        <motion.button
          className="w-[calc(100%-0px)] max-w-[280px] h-[56px] rounded-full bg-accent-pink text-white font-display text-xl uppercase tracking-[0.2em] shadow-btn-pink select-none"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, type: 'spring', stiffness: 200 }}
          whileHover={{ scale: 0.98 }}
          whileTap={{
            scale: 0.95,
            boxShadow: '0 2px 0 #C2185B, 0 4px 8px rgba(240, 98, 146, 0.3)',
          }}
          onClick={handlePlay}
        >
          {t(language, 'play')}
        </motion.button>

        {/* HOW TO PLAY Button */}
        <motion.button
          className="mt-3 px-6 py-2.5 rounded-full bg-white/50 backdrop-blur-sm text-text-dark font-bold text-sm border-2 border-white/80 hover:bg-white/80 transition-all select-none"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            playGameSound(soundEnabled, 'menu');
            setShowHowTo(true);
          }}
        >
          <div className="flex items-center gap-1.5">
            <HelpCircle size={16} />
            <span>{t(language, 'howToPlay')}</span>
          </div>
        </motion.button>
      </div>

      {/* Bottom grass tufts */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <div className="flex justify-between items-end px-2">
          <GrassTuft className="w-16 h-8 opacity-80" />
          <GrassTuft className="w-20 h-10 opacity-90 -mb-1" />
          <GrassTuft className="w-14 h-7 opacity-70" />
          <GrassTuft className="w-18 h-9 opacity-80" />
          <GrassTuft className="w-16 h-8 opacity-70" />
        </div>
      </div>

      {/* How To Play Modal */}
      <HowToPlayModal isOpen={showHowTo} onClose={() => setShowHowTo(false)} />
    </div>
  );
}
