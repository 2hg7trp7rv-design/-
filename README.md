# MoguMogu Smack!

MoguMogu Smack! is a mobile-style whack-a-mole web game built with React, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand, Vitest, Playwright, Web Audio API, and a lightweight custom service worker.

The project is designed as an app-like single page game: quick launch, portrait layout, animated moles, combo scoring, difficulty selection, local leaderboard, vibration support, generated sound effects, lightweight background music, Japanese/English UI switching, PWA install metadata, offline shell caching, update notification, and mobile viewport test coverage.

## Live deployment

Vercel URL:

```txt
https://lime-seven-80.vercel.app/
```

## Required workflow

- Work on the `main` branch only.
- Do not create feature branches for this project.
- Keep the cute MoguMogu visual direction intact when refactoring.
- Do not hide broken logic under additional wrappers. Remove the bad implementation and rewrite the affected area cleanly.
- Report any visual or UX changes clearly.

## Game rules

- Normal mole: +10 base points.
- Golden mole: +50 base points.
- Angry mole: -5 points and breaks combo.
- Combo multiplier:
  - 3+ combo: x1.5
  - 6+ combo: x2
  - 10+ combo: x3
- Letting a normal or golden mole disappear counts as a miss.
- Letting an angry mole disappear does not count as a miss.
- Combo timeout breaks the combo but does not count as a miss.
- High scores are tracked separately for `easy`, `normal`, and `hard`.

## Quality gates

Run these before pushing to `main`:

```bash
npm ci
npm run format:check
npm run lint
npm run test
npm run build
```

Optional device-style checks:

```bash
npm run e2e:install
npm run build
npm run e2e
```

Visual regression baseline flow:

```bash
npm run e2e:install
npm run build
npm run e2e:update
npm run e2e:visual
```

`e2e:update` creates or refreshes Playwright screenshot baselines. Review screenshot diffs before committing them.

## Current app-quality coverage

- Score, combo, miss, max combo, leaderboard, language setting, and difficulty rules are covered by store tests.
- Broken localStorage JSON recovery is covered by a storage test.
- Routing, direct `/game` behavior, and active-game navbar behavior are covered by component tests.
- Manifest branding, PNG/maskable icons, service worker update support, and Google Fonts removal are covered by PWA tests.
- Gameplay PNGs are declared in `GAME_IMAGE_FILES` and covered by an asset hygiene test so unused/generated image files do not silently drift.
- Auth helper logic is split into focused modules for errors, pending attempts, profile repository access, and timeout handling.
- Playwright covers mobile flow, pause/resume behavior, Japanese layout, unknown-route behavior, and visual guardrails.
- TypeScript test files are excluded from production `tsc -b` but included in Vitest.

## Audio

The app uses generated Web Audio API tones instead of external audio assets.

Implemented audio cues:

- Menu/toggle tap
- Countdown
- Game start
- Normal mole hit
- Golden mole hit
- Angry mole hit
- Combo milestone
- Friendly mole miss
- Pause/resume
- Game over
- Lightweight repeating background music while playing

Sound and music respect the Settings toggles. The audio context is unlocked only through user gestures.

## Production image assets

Transparent gameplay PNGs live under `public/game-assets/` and are referenced through `src/lib/gameImageAssets.ts`. `GAME_IMAGE_FILES` is the single source of truth for preloading and asset-hygiene tests.

```txt
mogumogu_transparent_01.png = golden mole
mogumogu_transparent_02.png = normal mole hit reaction
mogumogu_transparent_03.png = mole hole
mogumogu_transparent_04.png = mischievous trap mole
mogumogu_transparent_05.png = normal mole
mogumogu_transparent_06.png = golden mole hit reaction
mogumogu_transparent_07.png = mischievous trap mole hit reaction
```

Do not place these files only at the repository root. Vite production builds serve static, non-imported image files from `public/`, so the production-safe path is `/game-assets/<filename>`.

## PWA

The app includes:

- `public/manifest.json`
- `public/pwa-icon.svg`
- `public/pwa-icon-192.png`
- `public/pwa-icon-512.png`
- `public/pwa-maskable-512.png` (padded safe-zone variant for mobile icon masks)
- `public/apple-touch-icon.png`
- `public/sw.js`
- production-only service worker registration in `src/lib/serviceWorker.ts`
- update notification UI in `src/components/ServiceWorkerUpdateToast.tsx`

The service worker caches the app shell and static assets. HTML/navigation remains network-first so deployments do not get stuck on stale screens unnecessarily. When a new service worker is waiting, the app shows a small branded update prompt.

Final install/offline behavior still needs device-level confirmation after Vercel deployment, especially on iOS Safari and Android Chrome.

## Fonts

The app no longer depends on remote Google Fonts at startup. It uses a rounded system font stack with Japanese-friendly fallbacks such as Hiragino, Yu Gothic, Meiryo, and system UI fonts. No external font files are bundled.

## Language

Settings includes an English/Japanese language switch. The main gameplay UI, navigation, settings, ranking, not-found screen, dialogs, update notices, and recovery notices use the selected language.

## Resilience

- `ErrorBoundary` provides a MoguMogu-styled fallback instead of a white screen.
- `safeLocalStorage` quarantines broken persisted JSON and restarts safely.
- A small recovery notice tells the user when corrupted local data was isolated.

## Project structure

```txt
src/
  components/        Shared layout, navbar, modal, UI parts, update/recovery toasts, SVG assets
  hooks/             Accessibility helpers such as focus trap
  lib/               Audio, haptics, i18n, safe storage, service worker registration, utilities
  pages/             Home, Game, Ranking, Settings, NotFound
  store/             Zustand game state and scoring logic
  test/              Vitest setup
tests/
  e2e/               Playwright mobile user-flow tests
  visual/            Playwright screenshot regression tests
public/
  manifest.json      PWA install metadata
  pwa-icon*.png/svg  App icons
  sw.js              Service worker
```

## Commands

```bash
npm install
npm run dev
npm run format
npm run format:check
npm run lint
npm run test
npm run build
npm run preview
npm run e2e:install
npm run e2e
npm run e2e:update
npm run e2e:visual
```

## Visual direction

Keep the game playful, warm, and mobile-first:

- Cute mole mascot
- Green grass and sky background
- Soil-hole 3x3 playfield
- Pink and yellow arcade accents
- Cream cards and rounded buttons
- Short, bouncy animations
- Maximum app width around 430px

## Vercel install note

Vercel では `vercel.json` により `npm ci --no-audit --no-fund` を使用します。`package-lock.json` は公開 npm registry を参照する形で固定しています。

## Firebase online ranking

This build includes the Firebase/Auth + Firestore online ranking MVP.

### Firebase environment variables

Add these in Vercel Project Settings → Environment Variables:

```txt
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

`measurementId` is not required because Analytics is not used.

### Authentication

- Route: `/#/login`
- Google sign-in is used.
- Mobile-sized screens use redirect sign-in to avoid popup blocking.
- Settings and Ranking show the current login state.
- Game Over can send the score to the online leaderboard after sign-in.

### Firestore data model

Online scores are stored as one self-best document per user and difficulty:

```txt
leaderboards/{difficulty}/scores/{uid}
```

Examples:

```txt
leaderboards/easy/scores/{uid}
leaderboards/normal/scores/{uid}
leaderboards/hard/scores/{uid}
```

The Ranking page reads the Top 100 by difficulty with `orderBy('score', 'desc')`.

### Firestore Rules

Security rules are included in:

```txt
firestore.rules
```

The rules allow public reads of leaderboard documents, but only authenticated users can create/update their own document. Updates are accepted only when the submitted score is greater than or equal to the existing score and the payload passes basic integrity checks.

### Anti-cheat scope

This is a client + Firestore Rules MVP. It rejects obvious impossible payloads, such as positive scores with zero good hits, max combo greater than good hits, or scores that are too high for the recorded hit count. It is not server-authoritative. A stronger phase would add a Vercel Serverless Function with Firebase Admin SDK and signed run telemetry.

## Firebase login troubleshooting

If Google account selection succeeds but the app returns to `/#/login` as still signed out, make sure the current build includes `AuthBootstrap` mounted in `AppRoot`. That component initializes Firebase Auth redirect handling and `onAuthStateChanged` after the app returns from Google.

After deploying auth changes, redeploy Vercel and reload the app once so the updated service worker can replace the old cached bundle.

## Online ranking privacy model

The Firebase ranking flow uses Google login only for authentication. Public ranking data does not expose Google account information.

Public leaderboard documents are stored at:

```txt
leaderboards/{difficulty}/scores/{publicId}
```

Public fields:

- `publicId`
- `nickname`
- difficulty and score stats
- created/updated timestamps

Public leaderboard documents intentionally do not contain:

- Firebase Auth `uid`
- email
- Google display name
- photo URL
- provider ID

Private nickname profiles are stored at:

```txt
profiles/{uid}
```

The `profiles/{uid}` document is readable/writable only by the signed-in owner. Firestore Rules verify that leaderboard writes match the owner's private profile `publicId` and `nickname`.

## Firebase Auth on Vercel

This app uses Firebase Auth + Firestore for the online nickname leaderboard. On Vercel, iPhone/Safari redirect sign-in needs the Firebase Auth helper to be same-origin with the app.

Set the public Firebase env vars in Vercel. For this deployment, use the Vercel domain as the Auth domain:

```txt
VITE_FIREBASE_AUTH_DOMAIN=lime-seven-80.vercel.app
```

The app's `vercel.json` proxies Firebase Auth helper routes:

```txt
/__/auth/* -> https://mogumogu-699f5.firebaseapp.com/__/auth/*
```

Firebase Authentication must also list this as an authorized domain:

```txt
lime-seven-80.vercel.app
```

Do not put Google email, Google display name, photo URL, or Firebase UID into public leaderboard documents. Public leaderboard rows use only `publicId` and the player's chosen nickname.

### Public leaderboard privacy path

The online ranking stores new public scores under:

```txt
publicLeaderboardsV2/{difficulty}/scores/{publicId}
```

The legacy `leaderboards` path is denied by `firestore.rules`. This avoids showing or querying older score documents that may have been created before the nickname-only privacy model.

### Operator-only nickname setup

Reserved names that look official are blocked for normal players. To let the app owner use a nickname such as `運営者`, create this Firestore document manually after the owner has logged in once:

```txt
ownerUsers/{Firebase Auth UID}
```

Required field:

```txt
enabled: true
```

Do not store an email address, Google display name, or photo URL in this document. The public leaderboard still stores only `publicId`, `nickname`, and score data.

After every rules change, publish the latest `firestore.rules` in Firebase Console and redeploy Vercel if environment variables changed.

### UI spacing polish

Mobile layouts include shared safe-area top spacing utilities. The game stage adds an extra vertical offset for the HUD and hole grid so the first row does not feel pinned to the browser chrome.
