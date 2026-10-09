# CineScroll — mobile app (Expo)

Native Android/iOS app. Talks to the same API as the website (`EXPO_PUBLIC_API_URL`, default `https://this-scine.vercel.app`) and uses the same Clerk accounts.

## Setup
1. `cd mobile && npm install`
2. Create `mobile/.env.local` with `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...` (same key as the website), or set it as an EAS environment variable.
3. `npx eas-cli@latest init` to link the Expo project (writes `extra.eas.projectId`).

## Build
- Test APK: `npx eas-cli@latest build -p android --profile preview`
- Play Store bundle: `npx eas-cli@latest build -p android --profile production`

Push notifications on Android need Firebase (FCM v1) credentials uploaded to EAS: `npx eas-cli@latest credentials`.
