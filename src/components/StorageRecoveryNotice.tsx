import { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { consumeStorageRecoveryFlag } from '../lib/safeStorage';
import { t } from '../lib/i18n';
import { playGameSound } from '../lib/audio';
import { useGameStore } from '../store/gameStore';

export default function StorageRecoveryNotice() {
  const [visible, setVisible] = useState(() => consumeStorageRecoveryFlag());
  const language = useGameStore((state) => state.language);
  const soundEnabled = useGameStore((state) => state.soundEnabled);

  if (!visible) return null;

  const dismiss = () => {
    playGameSound(soundEnabled, 'menu');
    setVisible(false);
  };

  return (
    <div className="fixed left-3 right-3 top-4 z-[400] mx-auto max-w-[406px] rounded-2xl border-2 border-grass-light/40 bg-white/95 p-3 shadow-game backdrop-blur-sm safe-top">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grass-light/15 text-grass-dark">
          <ShieldCheck size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-text-dark">
            {t(language, 'storageRecoveredTitle')}
          </p>
          <p className="mt-0.5 text-xs font-semibold leading-snug text-text-light">
            {t(language, 'storageRecoveredDesc')}
          </p>
        </div>
        <button
          type="button"
          aria-label={t(language, 'dismiss')}
          onClick={dismiss}
          className="rounded-full p-1 text-text-light transition-colors hover:bg-soil-dark/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-pink/40"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
