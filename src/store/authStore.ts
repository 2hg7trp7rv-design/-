import { create } from 'zustand';
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import {
  clearPendingAttempt,
  isFreshPendingAttempt,
  writePendingAttempt,
} from '../lib/authAttempt';
import { getAuthErrorCode, shouldFallbackToRedirect, toAuthErrorMessage } from '../lib/authErrors';
import type { AuthStatus, AuthUser, ProfileStatus } from '../lib/authTypes';
import { withTimeout } from '../lib/async';
import {
  getAuthDomainDiagnostic,
  getCurrentHost,
  getFirebaseAuth,
  isFirebaseConfigured,
  isSameOriginAuthDomain,
  missingFirebaseEnvKeys,
  shouldPreferRedirectSignIn,
} from '../lib/firebase';
import { readPublicProfile, savePublicProfile } from '../lib/profileRepository';
import type { PublicProfile } from '../lib/profile';

interface AuthState {
  status: AuthStatus;
  profileStatus: ProfileStatus;
  user: AuthUser | null;
  profile: PublicProfile | null;
  error: string | null;
  diagnostic: string | null;
  lastProviderError: string | null;
  isConfigured: boolean;
  missingEnvKeys: string[];
  initializeAuth: () => Unsubscribe;
  signInWithGoogle: () => Promise<{ redirected: boolean }>;
  signOutUser: () => Promise<void>;
  completeProfile: (nickname: string) => Promise<PublicProfile | null>;
  reloadProfile: () => Promise<PublicProfile | null>;
  clearAuthError: () => void;
}

const AUTH_TIMEOUT_MS = 14_000;
const AUTH_GRACE_MS = 4_500;

let unsubscribeAuth: Unsubscribe | null = null;
let noUserFallbackTimer: ReturnType<typeof setTimeout> | null = null;

function toAuthUser(user: User): AuthUser {
  return { uid: user.uid };
}

function getProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

function clearNoUserFallbackTimer(): void {
  if (!noUserFallbackTimer) return;

  clearTimeout(noUserFallbackTimer);
  noUserFallbackTimer = null;
}

function redirectSetupMessage(): string {
  const host = getCurrentHost();

  return `iPhoneで安定させるには VITE_FIREBASE_AUTH_DOMAIN を ${host} にし、Vercelの /__/auth proxy を使って再デプロイしてください。`;
}

export const useAuthStore = create<AuthState>((set, get) => {
  const loadProfileForUser = async (user: AuthUser): Promise<PublicProfile | null> => {
    set({ profileStatus: 'loading', diagnostic: 'ニックネーム設定を確認中です。' });

    try {
      const profile = await readPublicProfile(user.uid);

      set({
        profile,
        profileStatus: profile ? 'ready' : 'missing',
        error: null,
        diagnostic: profile
          ? 'ログイン済みです。オンラインランキングを利用できます。'
          : 'ログイン済みです。ランキング用ニックネームを設定してください。',
      });

      return profile;
    } catch (error) {
      set({
        profile: null,
        profileStatus: 'error',
        error: toAuthErrorMessage(error),
        diagnostic: 'プロフィールの読み込みに失敗しました。',
      });
      return null;
    }
  };

  const handleFirebaseUser = async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      if (isFreshPendingAttempt()) {
        set({
          status: 'loading',
          profileStatus: 'idle',
          user: null,
          profile: null,
          diagnostic: 'Googleログインからの復帰を確認中です。',
        });
        return;
      }

      clearNoUserFallbackTimer();
      set({
        status: 'ready',
        profileStatus: 'idle',
        user: null,
        profile: null,
        diagnostic: '未ログインです。',
      });
      return;
    }

    clearNoUserFallbackTimer();
    clearPendingAttempt();

    const user = toAuthUser(firebaseUser);
    set({
      status: 'ready',
      user,
      error: null,
      lastProviderError: null,
      diagnostic: 'Googleログインを確認しました。',
    });

    await loadProfileForUser(user);
  };

  const settleNoUserAfterGrace = (auth: Auth, reason: string) => {
    clearNoUserFallbackTimer();

    if (!isFreshPendingAttempt()) {
      void handleFirebaseUser(null);
      return;
    }

    set({
      status: 'loading',
      diagnostic: 'ログイン結果の保存を確認中です。',
    });

    noUserFallbackTimer = setTimeout(() => {
      noUserFallbackTimer = null;

      if (get().user) return;

      if (auth.currentUser) {
        void handleFirebaseUser(auth.currentUser);
        return;
      }

      clearPendingAttempt();
      set({
        status: 'ready',
        profileStatus: 'idle',
        user: null,
        profile: null,
        error:
          'Googleログイン後の認証状態をアプリで受け取れませんでした。VercelのAuthドメイン/proxy設定を確認して、もう一度お試しください。',
        diagnostic: `${reason} ${getAuthDomainDiagnostic() ?? redirectSetupMessage()}`,
      });
    }, AUTH_GRACE_MS);
  };

  const startRedirectSignIn = async (auth: Auth, provider: GoogleAuthProvider) => {
    if (!isSameOriginAuthDomain()) {
      set({
        status: 'ready',
        error: redirectSetupMessage(),
        diagnostic: getAuthDomainDiagnostic(),
      });
      return { redirected: false };
    }

    writePendingAttempt('redirect');
    set({ status: 'loading', error: null, diagnostic: 'Googleログイン画面へ移動します。' });
    await signInWithRedirect(auth, provider);
    return { redirected: true };
  };

  return {
    status: 'idle',
    profileStatus: 'idle',
    user: null,
    profile: null,
    error: null,
    diagnostic: null,
    lastProviderError: null,
    isConfigured: isFirebaseConfigured,
    missingEnvKeys: missingFirebaseEnvKeys,

    initializeAuth: () => {
      if (unsubscribeAuth) return unsubscribeAuth;

      if (!isFirebaseConfigured) {
        set({
          status: 'ready',
          profileStatus: 'idle',
          user: null,
          profile: null,
          error: `Firebase environment variables are missing: ${missingFirebaseEnvKeys.join(', ')}`,
          diagnostic: 'Firebase環境変数が未設定です。',
        });
        return () => undefined;
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        set({
          status: 'ready',
          user: null,
          profile: null,
          profileStatus: 'idle',
          error: 'Firebase Auth is not available.',
          diagnostic: 'Firebase Authを初期化できませんでした。',
        });
        return () => undefined;
      }

      set({
        status: 'loading',
        error: null,
        diagnostic: isFreshPendingAttempt()
          ? 'Googleログインから戻りました。認証状態を確認しています。'
          : 'ログイン状態を確認中です。',
      });

      void withTimeout(getRedirectResult(auth), AUTH_TIMEOUT_MS, 'Googleログイン復帰確認')
        .then((result) => {
          if (result?.user) {
            void handleFirebaseUser(result.user);
            return;
          }

          if (isFreshPendingAttempt()) {
            settleNoUserAfterGrace(auth, 'リダイレクト結果は空でした。');
          }
        })
        .catch((error: unknown) => {
          set({
            lastProviderError: getAuthErrorCode(error) || toAuthErrorMessage(error),
            diagnostic: 'Googleログイン復帰の結果を確認できませんでした。',
          });

          settleNoUserAfterGrace(auth, toAuthErrorMessage(error));
        });

      unsubscribeAuth = onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            void handleFirebaseUser(user);
            return;
          }

          if (isFreshPendingAttempt()) {
            settleNoUserAfterGrace(auth, 'Firebaseから未ログイン状態が返りました。');
            return;
          }

          void handleFirebaseUser(null);
        },
        (error) => {
          clearPendingAttempt();
          set({
            status: 'ready',
            profileStatus: 'idle',
            user: null,
            profile: null,
            error: toAuthErrorMessage(error),
            lastProviderError: getAuthErrorCode(error),
            diagnostic: 'ログイン状態の確認に失敗しました。',
          });
        },
      );

      return unsubscribeAuth;
    },

    signInWithGoogle: async () => {
      if (!get().isConfigured) {
        set({
          error: 'Firebase is not configured yet.',
          diagnostic: 'Firebase環境変数が未設定です。',
        });
        return { redirected: false };
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        set({
          status: 'ready',
          error: 'Firebase Auth is not available.',
          diagnostic: 'Firebase Authを初期化できませんでした。',
        });
        return { redirected: false };
      }

      const provider = getProvider();

      if (shouldPreferRedirectSignIn()) {
        try {
          return await startRedirectSignIn(auth, provider);
        } catch (error) {
          clearPendingAttempt();
          set({
            status: 'ready',
            error: toAuthErrorMessage(error),
            lastProviderError: getAuthErrorCode(error),
            diagnostic: 'リダイレクトログインに失敗しました。',
          });
          return { redirected: false };
        }
      }

      writePendingAttempt('popup');
      set({
        status: 'loading',
        error: null,
        diagnostic: 'Googleログインを開始しています。',
      });

      try {
        const credential = await withTimeout(
          signInWithPopup(auth, provider),
          AUTH_TIMEOUT_MS,
          'Googleログイン',
        );
        await handleFirebaseUser(credential.user);
        return { redirected: false };
      } catch (error) {
        const providerError = getAuthErrorCode(error) || toAuthErrorMessage(error);
        set({ lastProviderError: providerError });

        if (shouldFallbackToRedirect(error)) {
          try {
            set({
              diagnostic: isSameOriginAuthDomain()
                ? 'ポップアップ結果を受け取れなかったため、リダイレクトログインに切り替えます。'
                : redirectSetupMessage(),
            });

            return await startRedirectSignIn(auth, provider);
          } catch (redirectError) {
            clearPendingAttempt();
            set({
              status: 'ready',
              error: toAuthErrorMessage(redirectError),
              lastProviderError: getAuthErrorCode(redirectError),
              diagnostic: 'リダイレクトログインに失敗しました。',
            });
            return { redirected: false };
          }
        }

        clearPendingAttempt();
        set({
          status: 'ready',
          error: toAuthErrorMessage(error),
          diagnostic: 'Googleログインに失敗しました。',
        });
        return { redirected: false };
      }
    },

    signOutUser: async () => {
      clearPendingAttempt();
      clearNoUserFallbackTimer();

      const auth = getFirebaseAuth();
      if (!auth) {
        set({ user: null, profile: null, profileStatus: 'idle' });
        return;
      }

      await signOut(auth);
      set({
        user: null,
        profile: null,
        error: null,
        lastProviderError: null,
        status: 'ready',
        profileStatus: 'idle',
        diagnostic: 'ログアウトしました。',
      });
    },

    completeProfile: async (nickname: string) => {
      const user = get().user;
      if (!user) {
        set({ error: 'ログインしてからニックネームを設定してください。' });
        return null;
      }

      set({ profileStatus: 'loading', error: null, diagnostic: 'ニックネームを保存中です。' });

      try {
        const profile = await savePublicProfile(user.uid, nickname, get().profile);
        set({
          profile,
          profileStatus: 'ready',
          error: null,
          diagnostic: 'ニックネームを保存しました。',
        });
        return profile;
      } catch (error) {
        set({
          profileStatus: get().profile ? 'ready' : 'missing',
          error: toAuthErrorMessage(error),
          diagnostic: 'ニックネーム保存に失敗しました。',
        });
        return null;
      }
    },

    reloadProfile: async () => {
      const user = get().user;
      if (!user) return null;

      return loadProfileForUser(user);
    },

    clearAuthError: () => set({ error: null }),
  };
});
