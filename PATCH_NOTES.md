# Firebase Auth privacy + nickname hotfix

## Summary

This pass fixes the login loop and privacy issues found after testing the Firebase login flow on the deployed Vercel app.

The previous implementation used redirect-first login on mobile and stored Google-derived display names in public leaderboard documents. This version changes the authentication flow and data model so that:

- popup sign-in is tried first
- redirect is only a fallback
- redirect results and auth state are both handled
- loading states cannot remain forever without feedback
- Google name, email, photo URL, provider ID, and Firebase UID are not written to public leaderboard data
- players must choose a public nickname before saving online scores

## Implemented

1. Reworked `src/store/authStore.ts`
   - popup-first Google login
   - redirect fallback only when popup cannot be used
   - `getRedirectResult` processing
   - `onAuthStateChanged` processing
   - timeout/error handling
   - diagnostic messages
   - no public use of Google `displayName` or `email`

2. Added `profiles/{uid}` support
   - private user profile
   - `nickname`
   - generated `publicId`
   - Google profile fields are not stored in the public profile object used by the app

3. Added nickname flow
   - new route: `/#/nickname`
   - nickname entry screen
   - 2 to 12 character validation
   - email-like names blocked
   - URL-like names blocked
   - official-looking/reserved names blocked

4. Changed online leaderboard model
   - old: `leaderboards/{difficulty}/scores/{uid}`
   - new: `publicLeaderboardsV2/{difficulty}/scores/{publicId}`
   - public ranking docs contain only `publicId` and `nickname`
   - public ranking docs do not contain `uid`, `email`, `displayName`, `photoURL`, or `providerId`

5. Updated Game Over online save
   - not logged in → login
   - logged in without nickname → nickname page
   - logged in with nickname → save online

6. Updated Ranking and account cards
   - show nickname only
   - Google account name/email is not displayed
   - old malformed online score documents are ignored client-side

7. Rebuilt Firestore Rules
   - private `profiles/{uid}`
   - public but validated `publicLeaderboardsV2/{difficulty}/scores/{publicId}`
   - leaderboard writes require the signed-in user's profile publicId/nickname to match
   - forbidden Google/Auth fields are not part of the allowed score schema

8. Updated service worker cache
   - `mogumogu-smack-v12`

9. Added tests
   - nickname validation
   - publicId generation
   - leaderboard payload privacy
   - forbidden public fields are checked

## Important deployment note

Because the Firestore schema changed, paste the new `firestore.rules` into Firebase Console and publish it before testing online save.

If you created old online ranking docs with the previous implementation, delete old documents under:

```txt
leaderboards/easy/scores
leaderboards/normal/scores
leaderboards/hard/scores
```

Old docs may contain `uid` or `displayName`. The new app ignores those client-side, and the new Rules only allow valid privacy-safe docs.

## Verification

Executed successfully:

```bash
npm install --no-audit --no-fund
npm run format
npm run lint
npm run test
npm run build
```

Build succeeds with Vite chunk-size warnings caused by Firebase SDK bundle size. This is not a build failure.

# Firebase Auth stability hotfix

## Summary

This pass fixes the remaining Google sign-in loop by hardening Firebase Auth initialization and redirect handling for Vercel/iPhone browsers. It also keeps the nickname/privacy leaderboard model intact.

## Fixed in this pass

1. Moved `AuthBootstrap` to a single app-level mount point. It is no longer mounted twice.
2. Replaced `getAuth(app)` initialization with `initializeAuth()` and explicit persistence fallbacks:
   - IndexedDB
   - localStorage
   - sessionStorage
3. Added Firebase popup/redirect resolver configuration.
4. Added pending-auth session tracking before popup or redirect starts.
5. Added post-return auth-state grace handling so the app does not instantly fall back to “not signed in”.
6. Added clearer diagnostics when Google returns but Firebase user state is still null.
7. Added safer popup-to-redirect fallback handling.
8. Added Vercel `/__/auth/:path*` rewrite before the SPA fallback.
9. Updated Service Worker to `mogumogu-smack-v13`.
10. Excluded `/__/auth/` from Service Worker fetch handling so Firebase Auth helper routes are not swallowed by the app shell.
11. Added JS/CSS runtime cache coverage.
12. Added regression tests for the Vercel auth rewrite and Service Worker auth-route exclusion.

## Important deployment note

For iPhone/Safari redirect stability on Vercel, set this Vercel environment variable after deploying this code:

```txt
VITE_FIREBASE_AUTH_DOMAIN=lime-seven-80.vercel.app
```

This is different from the basic Firebase Web SDK config value. This repository now proxies `/__/auth/*` to:

```txt
https://mogumogu-699f5.firebaseapp.com/__/auth/*
```

Keep `lime-seven-80.vercel.app` in Firebase Authentication authorized domains.

## Verification

Executed successfully:

```bash
npm ci --no-audit --no-fund
npm run format
npm run format:check
npm run lint
npm run test
npm run build
npm run e2e -- --list
npm run e2e:visual -- --list
```

Results:

- format:check passed
- lint passed
- test passed: 7 files / 33 tests
- build passed with Firebase chunk-size warnings only
- e2e list passed
- visual e2e list passed

## Auth stability audit follow-up

- Moved the public online leaderboard path from `leaderboards` to `publicLeaderboardsV2` so older documents that may contain Google-derived fields are not exposed through the new public ranking UI.
- Updated Firestore Rules so public leaderboard list queries are not guarded by `resource.data` validation. This avoids Firestore's "rules are not filters" query-denial problem.
- Added an explicit deny rule for the legacy `leaderboards/{document=**}` path.
- Added guardrail tests for the new ranking collection and Firestore list-query rule shape.

# Codebase cleanup + visual asset hygiene pass

## Summary

This pass removes the patch-on-patch feel left by the Firebase Auth fixes and tightens the project for future maintenance without changing the core game flow.

## Implemented

1. Split the oversized auth store into focused support modules:
   - `src/lib/authAttempt.ts`
   - `src/lib/authErrors.ts`
   - `src/lib/authTypes.ts`
   - `src/lib/async.ts`
   - `src/lib/profileRepository.ts`

2. Kept `src/store/authStore.ts` as the state orchestrator only.
   - Auth state transitions remain in one store.
   - Firebase profile reads/writes no longer live directly inside the store.
   - Error conversion, timeout handling, and pending-login storage are isolated.

3. Added publicId ownership locking.
   - New private lock collection: `publicIds/{publicId}`
   - `profiles/{uid}` creation now claims a publicId lock in the same write batch.
   - Leaderboard writes require the signed-in user to own that publicId lock.
   - This reduces the risk of a client pretending to be another public ranking identity.

4. Updated Firestore Rules.
   - Added `publicIds/{publicId}`.
   - Added profile creation checks using `getAfter()`.
   - Added publicId ownership checks before public leaderboard writes.
   - Mirrored reserved nickname restrictions more closely in Rules.

5. Extracted online score saving out of `Game.tsx`.
   - New hook: `src/hooks/useOnlineScoreSave.ts`
   - Game screen now owns gameplay; online save flow is isolated.

6. Cleaned visual assets.
   - Removed unused legacy SVG mole/hammer/logo component files after the PNG sprite migration.
   - Kept only exported/used visual components:
     - `GrassTuft`
     - `MoleSprite`
     - `StarEmpty`
     - `StarFilled`
   - Added `GAME_IMAGE_FILES` as the declared game PNG source of truth.
   - Rebuilt `pwa-maskable-512.png` as a padded safe-zone icon instead of a duplicate of the normal 512 icon.

7. Added asset guardrail tests.
   - Every PNG in `public/game-assets/` must be declared in `GAME_IMAGE_FILES`.
   - Removed legacy SVG component files must not reappear unnoticed.
   - Maskable PWA icon must be distinct from the standard 512 icon.

## Verification

Executed successfully:

```bash
npm ci --no-audit --no-fund
npm run format
npm run format:check
npm run lint
npm run test
npm run build
npm run e2e -- --list
npm run e2e:visual -- --list
```

Results:

- format:check passed
- lint passed
- test passed: 9 files / 40 tests
- build passed with Firebase chunk-size warnings only
- e2e list passed
- visual e2e list passed

## Owner nickname guardrail hotfix

- Added `ownerUsers/{uid}` as a private Firestore allow-list for the app operator.
- Reserved names such as `運営`, `公式`, `管理者`, `admin`, `official`, `Google`, and `Firebase` remain blocked for normal users.
- The operator can use reserved/operator-style nicknames only when their Firebase Auth UID has a Firestore document at `ownerUsers/{uid}` with `enabled: true`.
- Profile creation/update and online score submission now mirror this owner exception in both TypeScript validation and Firestore Rules.
- Normal users do not need to read `ownerUsers` unless they try a reserved nickname, so ordinary nickname setup stays lightweight.
- If Settings shows “Firestoreの権限が不足しています”, deploy the latest `firestore.rules` first; the app cannot fix unpublished rules from the client side.

## 2026-07-01 UI spacing polish

- Added shared top-offset utilities so page headers sit lower under mobile browser chrome.
- Shifted the game HUD and hole grid downward to reduce the cramped top edge on iPhone Safari.
- Lowered the Home settings button/main cluster slightly for consistent safe-area breathing room.
- Bumped the service worker cache to `mogumogu-smack-v14` so deployed CSS/layout changes refresh cleanly.
