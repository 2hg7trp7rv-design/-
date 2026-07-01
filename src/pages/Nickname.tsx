import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ChevronLeft, ShieldCheck, UserRound } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { t } from '../lib/i18n';
import { MAX_NICKNAME_LENGTH, MIN_NICKNAME_LENGTH, validateNickname } from '../lib/profile';
import { playGameSound } from '../lib/audio';

export default function Nickname() {
  const navigate = useNavigate();
  const language = useGameStore((state) => state.language);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const {
    user,
    profile,
    status,
    profileStatus,
    error,
    diagnostic,
    completeProfile,
    clearAuthError,
  } = useAuthStore();
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const validation = validateNickname(nickname, { allowReservedWords: true });
  const isSaving = profileStatus === 'loading';

  useEffect(() => {
    if (status === 'ready' && !user) {
      navigate('/login');
    }
  }, [navigate, status, user]);

  const handleBack = () => {
    playGameSound(soundEnabled, 'menu');
    navigate(-1);
  };

  const handleSubmit = async () => {
    playGameSound(soundEnabled, 'menu');
    clearAuthError();

    if (validation.errors.length > 0) return;

    const savedProfile = await completeProfile(nickname);
    if (savedProfile) {
      navigate('/ranking');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-bg-cream">
      <div className="page-top-offset px-4">
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
            <UserRound size={30} className="text-accent-pink" />
          </div>

          <h1 className="text-center font-display text-3xl text-text-dark">
            {t(language, 'nicknameTitle')}
          </h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-text-light">
            {t(language, 'nicknameDesc')}
          </p>

          <div className="mt-5 rounded-2xl bg-bg-cream p-3">
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="mt-0.5 shrink-0 text-grass-mid" />
              <p className="text-sm font-semibold leading-relaxed text-text-dark">
                {t(language, 'nicknamePrivacyNote')}
              </p>
            </div>
          </div>

          <label className="mt-5 block text-sm font-extrabold text-text-dark" htmlFor="nickname">
            {t(language, 'nickname')}
          </label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            maxLength={MAX_NICKNAME_LENGTH + 4}
            onChange={(event) => {
              clearAuthError();
              setNickname(event.target.value);
            }}
            className="mt-2 h-12 w-full rounded-2xl border-2 border-soil-light bg-white px-4 text-center text-lg font-extrabold text-text-dark outline-none focus:border-accent-pink focus:ring-4 focus:ring-accent-pink/20"
            placeholder={t(language, 'nicknamePlaceholder')}
            autoComplete="nickname"
          />

          <p className="mt-2 text-center text-xs text-text-light">
            {MIN_NICKNAME_LENGTH}〜{MAX_NICKNAME_LENGTH}
            {t(language, 'nicknameLengthSuffix')}
          </p>

          {validation.errors.length > 0 && nickname.trim().length > 0 && (
            <p className="mt-3 rounded-2xl bg-accent-red/10 p-3 text-xs font-semibold text-accent-red">
              {validation.errors[0]}
            </p>
          )}

          {error && (
            <p className="mt-3 rounded-2xl bg-accent-red/10 p-3 text-xs font-semibold text-accent-red">
              {error}
            </p>
          )}

          {diagnostic && !error && (
            <p className="mt-3 rounded-2xl bg-grass-light/10 p-3 text-xs font-semibold text-grass-dark">
              {diagnostic}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving || validation.errors.length > 0}
            className="mt-5 h-12 w-full rounded-full bg-accent-pink font-display text-lg text-white shadow-btn-pink disabled:opacity-60 active:translate-y-1 active:shadow-btn-pink-pressed"
          >
            {isSaving ? t(language, 'saving') : t(language, 'saveNickname')}
          </button>

          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-soil-light/70 bg-white p-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-text-light" />
            <p className="text-xs leading-relaxed text-text-light">
              {t(language, 'nicknameRuleDesc')}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
