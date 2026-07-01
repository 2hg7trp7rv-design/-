import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { playGameSound } from '../lib/audio';
import { t } from '../lib/i18n';
import { useGameStore } from '../store/gameStore';
import { MoleSprite } from './assets';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const language = useGameStore((state) => state.language);
  const soundEnabled = useGameStore((state) => state.soundEnabled);

  const instructions = useMemo(
    () => [
      {
        icon: <MoleSprite type="normal" className="h-11 w-11 object-contain" />,
        title: t(language, 'howToNormalTitle'),
        desc: t(language, 'howToNormalDesc'),
      },
      {
        icon: <MoleSprite type="angry" className="h-11 w-11 object-contain" />,
        title: t(language, 'howToAngryTitle'),
        desc: t(language, 'howToAngryDesc'),
      },
      {
        icon: <MoleSprite type="golden" className="h-11 w-11 object-contain" />,
        title: t(language, 'howToGoldenTitle'),
        desc: t(language, 'howToGoldenDesc'),
      },
      {
        icon: (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-orange/15">
            <span className="font-display text-lg text-accent-orange">x3</span>
          </div>
        ),
        title: t(language, 'howToComboTitle'),
        desc: t(language, 'howToComboDesc'),
      },
    ],
    [language],
  );

  const closeWithSound = useCallback(() => {
    playGameSound(soundEnabled, 'menu');
    onClose();
  }, [onClose, soundEnabled]);

  useFocusTrap(dialogRef, isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeWithSound();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeWithSound, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            aria-hidden="true"
            className="fixed inset-0 z-[100] bg-text-dark/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeWithSound}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed bottom-0 left-0 right-0 z-[200] mx-auto max-h-[calc(100dvh-2rem)] max-w-[430px] overflow-y-auto rounded-t-3xl bg-bg-cream p-6 shadow-game safe-bottom focus:outline-none"
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-soil-light/50" />
            <button
              ref={closeButtonRef}
              type="button"
              aria-label={t(language, 'dismiss')}
              onClick={closeWithSound}
              className="absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-soil-dark/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-pink/40"
            >
              <X size={24} className="text-text-dark/60" />
            </button>
            <h2 id={titleId} className="mb-6 text-center font-display text-3xl text-text-dark">
              {t(language, 'howToPlayTitle')}
            </h2>
            <div className="mb-6 space-y-4">
              {instructions.map((item, index) => (
                <motion.div
                  key={item.title}
                  className="flex items-start gap-4 rounded-2xl bg-white p-3 shadow-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.08 }}
                >
                  <div className="mt-0.5 shrink-0">{item.icon}</div>
                  <div>
                    <p className="text-sm font-bold text-text-dark">{item.title}</p>
                    <p className="mt-0.5 text-xs text-text-light">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <button
              type="button"
              onClick={closeWithSound}
              className="h-14 w-full select-none rounded-full bg-accent-pink font-display text-lg font-extrabold uppercase tracking-widest text-white shadow-btn-pink transition-all active:translate-y-1 active:shadow-btn-pink-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-pink/40"
            >
              {t(language, 'gotIt')}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
