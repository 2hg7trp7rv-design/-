import { useEffect, useRef, useState } from 'react';
import { RefreshCcw, X } from 'lucide-react';
import { playGameSound } from '../lib/audio';
import { t } from '../lib/i18n';
import { useGameStore } from '../store/gameStore';

type UpdateEvent = CustomEvent<{ registration: ServiceWorkerRegistration }>;

export default function ServiceWorkerUpdateToast() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const refreshingRef = useRef(false);
  const language = useGameStore((state) => state.language);
  const soundEnabled = useGameStore((state) => state.soundEnabled);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const customEvent = event as UpdateEvent;
      setRegistration(customEvent.detail.registration);
    };

    const handleControllerChange = () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      window.location.reload();
    };

    window.addEventListener('mogumogu:update-available', handleUpdate);
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

    return () => {
      window.removeEventListener('mogumogu:update-available', handleUpdate);
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  if (!registration?.waiting) return null;

  const updateNow = () => {
    playGameSound(soundEnabled, 'menu');
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
  };

  const dismiss = () => {
    playGameSound(soundEnabled, 'menu');
    setRegistration(null);
  };

  return (
    <div className="fixed bottom-4 left-3 right-3 z-[450] mx-auto max-w-[406px] rounded-3xl border-2 border-accent-yellow/60 bg-bg-cream/95 p-4 shadow-game backdrop-blur-sm safe-bottom">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-yellow/25 text-soil-dark">
          <RefreshCcw size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg text-text-dark">{t(language, 'updateTitle')}</p>
          <p className="mt-0.5 text-xs font-semibold leading-snug text-text-light">
            {t(language, 'updateDesc')}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={updateNow}
              className="rounded-full bg-accent-pink px-4 py-2 text-xs font-extrabold tracking-wider text-white shadow-btn-pink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-pink/40"
            >
              {t(language, 'updateNow')}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full bg-white px-4 py-2 text-xs font-extrabold text-text-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-pink/40"
            >
              {t(language, 'later')}
            </button>
          </div>
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
