import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const requiredEnv = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
} as const;

export const firebaseRuntimeConfig = requiredEnv;

export const missingFirebaseEnvKeys = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([key]) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`);

export const isFirebaseConfigured = missingFirebaseEnvKeys.length === 0;

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestore: Firestore | null = null;

export function getCurrentHost(): string {
  if (typeof window === 'undefined') return '';
  return window.location.host;
}

export function getCurrentOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export function isSameOriginAuthDomain(): boolean {
  return Boolean(requiredEnv.authDomain && getCurrentHost() === requiredEnv.authDomain);
}

export function isFirebaseHostedAuthDomain(): boolean {
  return /\.firebaseapp\.com$|\.web\.app$/.test(requiredEnv.authDomain ?? '');
}

export function getAuthDomainDiagnostic(): string | null {
  if (!isFirebaseConfigured) return null;

  const currentHost = getCurrentHost();
  if (!currentHost) return null;

  if (isSameOriginAuthDomain()) {
    return 'Auth handler is same-origin. Redirect sign-in can use the Vercel /__/auth proxy.';
  }

  if (isFirebaseHostedAuthDomain()) {
    return `Auth domain is ${requiredEnv.authDomain}. iPhone/Safari redirect sign-in may fail unless VITE_FIREBASE_AUTH_DOMAIN is set to ${currentHost} and /__/auth is proxied.`;
  }

  return `Auth domain is ${requiredEnv.authDomain}. Current host is ${currentHost}.`;
}

export function shouldPreferRedirectSignIn(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios|chrome/.test(userAgent);
  const isStandalone =
    'standalone' in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  const narrow = window.matchMedia?.('(max-width: 768px)').matches ?? false;

  return isSameOriginAuthDomain() && (isIOS || isSafari || isStandalone || narrow);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;

  firebaseApp ??= initializeApp(requiredEnv);
  return firebaseApp;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;

  if (!firebaseAuth) {
    try {
      firebaseAuth = initializeAuth(app, {
        persistence: [
          indexedDBLocalPersistence,
          browserLocalPersistence,
          browserSessionPersistence,
        ],
        popupRedirectResolver: browserPopupRedirectResolver,
      });
    } catch {
      firebaseAuth = getAuth(app);
    }
  }

  return firebaseAuth;
}

export function getFirebaseDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;

  firestore ??= getFirestore(app);
  return firestore;
}
