import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, LogIn, ShieldCheck, Trophy, AlertCircle } from 'lucide-react';
import AuthStatusCard from '../components/AuthStatusCard';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { playGameSound } from '../lib/audio';
import { t } from '../lib/i18n';

export default function Login() {
  const navigate = useNavigate();
  const language = useGameStore((state) => state.language);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const {
    user,
    profile,
    status,
    profileStatus,
    isConfigured,
    missingEnvKeys,
    error,
    diagnostic,
    signInWithGoogle,
  } = useAuthStore();

  useEffect(() => {
    if (user && profile) {
      const timer = setTimeout(() => navigate('/ranking'), 700);
      return () => clearTimeout(timer);
    }

    if (user && profileStatus === 'missing') {
      const timer = setTimeout(() => navigate('/nickname'), 500);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [navigate, profile, profileStatus, user]);

  const handleBack = () => {
    playGameSound(soundEnabled, 'menu');
    navigate(-1);
  };

  const handleSignIn = async () => {
    playGameSound(soundEnabled, 'menu');
    await signInWithGoogle();
  };

  return (
    <div className="h-full overflow-y-auto bg-bg-cream">
      <div className="safe-top px-4 pt-4">
        <button
          type="button"
          aria-label={t(language, 'goBack')}
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <ChevronLeft size={18} className="text-text-dark" />
        </button>
      </div>

      <div className="flex min-h-[calc(100%-72px)] flex-col items-center justify-center px-5 pb-8">
        <motion.div
          className="w-full max-w-[360px] rounded-[2rem] bg-white p-6 shadow-game"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-pink/10">
            <LogIn size={30} className="text-accent-pink" />
          </div>

          <h1 className="text-center font-display text-3xl text-text-dark">
            {t(language, 'loginTitle')}
          </h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-text-light">
            {t(language, 'loginDesc')}
          </p>

          <div className="mt-5 grid gap-3">
            <div className="flex items-start gap-3 rounded-2xl bg-bg-cream p-3">
              <Trophy size={20} className="mt-0.5 shrink-0 text-accent-yellow" />
              <p className="text-sm font-semibold leading-relaxed text-text-dark">
                {t(language, 'loginBenefitRanking')}
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-bg-cream p-3">
              <ShieldCheck size={20} className="mt-0.5 shrink-0 text-grass-mid" />
              <p className="text-sm font-semibold leading-relaxed text-text-dark">
                {t(language, 'loginBenefitSafety')}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <AuthStatusCard />
          </div>

          {!user && isConfigured && (
            <button
              type="button"
              onClick={() => void handleSignIn()}
              disabled={status === 'loading'}
              className="mt-4 h-12 w-full rounded-full bg-accent-pink font-display text-lg text-white shadow-btn-pink disabled:opacity-60 active:translate-y-1 active:shadow-btn-pink-pressed"
            >
              {status === 'loading' ? t(language, 'loading') : t(language, 'continueWithGoogle')}
            </button>
          )}

          {!isConfigured && (
            <div className="mt-4 rounded-2xl border-2 border-accent-orange/30 bg-accent-orange/5 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-accent-orange" />
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-text-dark">
                    {t(language, 'firebaseNotConfigured')}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-text-light">
                    {missingEnvKeys.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {diagnostic && isConfigured && !error && (
            <p className="mt-3 rounded-2xl bg-grass-light/10 p-3 text-xs font-semibold text-grass-dark">
              {diagnostic}
            </p>
          )}

          {error && isConfigured && (
            <p className="mt-3 rounded-2xl bg-accent-red/10 p-3 text-xs font-semibold text-accent-red">
              {error}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
