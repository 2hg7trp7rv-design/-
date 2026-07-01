import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, RotateCcw } from 'lucide-react';
import { GrassTuft } from '../components/assets';
import { playGameSound, unlockAudio } from '../lib/audio';
import { t } from '../lib/i18n';
import { useGameStore } from '../store/gameStore';
import { GAME_IMAGE_ASSETS } from '../lib/gameImageAssets';

export default function NotFound() {
  const navigate = useNavigate();
  const language = useGameStore((state) => state.language);
  const soundEnabled = useGameStore((state) => state.soundEnabled);

  const goHome = () => {
    unlockAudio();
    playGameSound(soundEnabled, 'menu');
    navigate('/');
  };

  return (
    <div
      className="h-full relative overflow-hidden flex flex-col items-center justify-center px-6 text-center"
      style={{
        background:
          'linear-gradient(180deg, #4FC3F7 0%, #81D4FA 50%, #81D4FA 70%, #66BB6A 70%, #43A047 100%)',
      }}
    >
      <motion.div
        className="w-32 h-32 mb-3"
        initial={{ opacity: 0, y: 20, scale: 0.8 }}
        animate={{ opacity: 1, y: [0, -8, 0], scale: 1 }}
        transition={{
          opacity: { duration: 0.3 },
          scale: { duration: 0.4, type: 'spring', stiffness: 250 },
          y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
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

      <motion.p
        className="font-display text-6xl text-white"
        style={{ textShadow: '0 3px 0 #5D4037, 0 4px 10px rgba(0,0,0,0.3)' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        404
      </motion.p>
      <motion.h1
        className="mt-1 font-display text-2xl text-accent-yellow"
        style={{ textShadow: '0 2px 0 #5D4037, 0 3px 8px rgba(0,0,0,0.3)' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        {t(language, 'lostTitle')}
      </motion.h1>
      <motion.p
        className="mt-3 max-w-[280px] rounded-2xl bg-white/55 px-4 py-3 text-sm font-bold text-text-dark backdrop-blur-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
      >
        {t(language, 'lostDesc')}
      </motion.p>

      <motion.button
        type="button"
        className="mt-6 h-12 rounded-full bg-accent-pink px-8 py-3 font-display text-base tracking-[0.18em] text-white shadow-btn-pink active:shadow-btn-pink-pressed active:translate-y-1"
        onClick={goHome}
        whileTap={{ scale: 0.96 }}
      >
        <span className="flex items-center justify-center gap-2">
          <Home size={18} />
          {t(language, 'home')}
        </span>
      </motion.button>

      <button
        type="button"
        className="mt-4 flex items-center gap-1.5 text-xs font-extrabold text-white/85 underline decoration-white/50 underline-offset-4"
        onClick={() => window.location.reload()}
      >
        <RotateCcw size={14} />
        {t(language, 'reloadApp')}
      </button>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0">
        <div className="flex items-end justify-between px-2">
          <GrassTuft className="h-8 w-16 opacity-80" />
          <GrassTuft className="-mb-1 h-10 w-20 opacity-90" />
          <GrassTuft className="h-7 w-14 opacity-70" />
          <GrassTuft className="h-9 w-18 opacity-80" />
          <GrassTuft className="h-8 w-16 opacity-70" />
        </div>
      </div>
    </div>
  );
}
