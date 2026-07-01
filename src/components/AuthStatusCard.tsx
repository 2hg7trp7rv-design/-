import { LogIn, LogOut, UserRound, AlertCircle, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { t } from '../lib/i18n';

interface AuthStatusCardProps {
  compact?: boolean;
}

export default function AuthStatusCard({ compact = false }: AuthStatusCardProps) {
  const navigate = useNavigate();
  const language = useGameStore((state) => state.language);
  const {
    user,
    profile,
    status,
    profileStatus,
    error,
    diagnostic,
    isConfigured,
    signInWithGoogle,
    signOutUser,
  } = useAuthStore();

  const handleSignIn = async () => {
    if (!isConfigured) {
      navigate('/login');
      return;
    }

    await signInWithGoogle();
  };

  if (!isConfigured) {
    return (
      <div className="rounded-2xl border-2 border-accent-orange/30 bg-white p-3 text-sm shadow-sm">
        <div className="flex items-start gap-2">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-accent-orange" />
          <div className="min-w-0">
            <p className="font-bold text-text-dark">{t(language, 'firebaseNotConfigured')}</p>
            {!compact && (
              <p className="mt-1 text-xs leading-relaxed text-text-light">
                {t(language, 'firebaseNotConfiguredDesc')}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (user && profile) {
    return (
      <div className="rounded-2xl bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grass-light/20">
            <UserRound size={20} className="text-grass-mid" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-text-dark">{profile.nickname}</p>
            {!compact && (
              <p className="truncate text-xs text-text-light">{t(language, 'privacySignedIn')}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate('/nickname')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-soil-light bg-white text-text-light active:translate-y-0.5"
            aria-label={t(language, 'editNickname')}
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => void signOutUser()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-soil-light bg-white text-text-light active:translate-y-0.5"
            aria-label={t(language, 'logout')}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (user && !profile) {
    return (
      <div className="rounded-2xl bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-pink/10">
            <UserRound size={20} className="text-accent-pink" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-text-dark">
              {t(language, 'nicknameRequired')}
            </p>
            {!compact && (
              <p className="text-xs text-text-light">
                {diagnostic ?? t(language, 'nicknameRequiredDesc')}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate('/nickname')}
            disabled={profileStatus === 'loading'}
            className="shrink-0 rounded-full bg-accent-pink px-4 py-2 text-xs font-extrabold text-white shadow-btn-pink disabled:opacity-60 active:translate-y-0.5"
          >
            {profileStatus === 'loading' ? t(language, 'loading') : t(language, 'setNickname')}
          </button>
        </div>
        {error && <p className="mt-2 line-clamp-2 text-xs text-accent-red">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-pink/10">
          <LogIn size={20} className="text-accent-pink" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-text-dark">{t(language, 'notSignedIn')}</p>
          {!compact && <p className="text-xs text-text-light">{t(language, 'signInToSave')}</p>}
          {error && <p className="mt-1 line-clamp-2 text-xs text-accent-red">{error}</p>}
        </div>
        <button
          type="button"
          onClick={() => void handleSignIn()}
          disabled={status === 'loading'}
          className="shrink-0 rounded-full bg-accent-pink px-4 py-2 text-xs font-extrabold text-white shadow-btn-pink disabled:opacity-60 active:translate-y-0.5"
        >
          {status === 'loading' ? t(language, 'loading') : t(language, 'login')}
        </button>
      </div>
    </div>
  );
}
