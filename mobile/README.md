# Pranjay Android App (Capacitor)

Native Android shell for the Pranjay cosmetics shop. Loads the deployed Next.js site in a WebView — no separate app codebase to maintain.

## Prerequisites

- Node.js 20+
- **JDK 17** (Gradle/Android Gradle Plugin; Java 21+ may fail with "Unsupported class file major version")
- [Android Studio](https://developer.android.com/studio) with SDK 34+

## Quick start

```bash
cd mobile
npm install

# Point at your live shop (default: https://pranjay.com)
export CAPACITOR_SERVER_URL=https://pranjay.com

npx cap add android    # first time only
npm run cap:sync
npm run cap:open       # opens Android Studio
```

In Android Studio: **Run** on emulator or device, or build APK:

```bash
npm run build:apk
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

## Configuration

| Variable | Purpose |
|----------|---------|
| `CAPACITOR_SERVER_URL` | Shop URL loaded in WebView (override at sync time) |
| `server.url` in `capacitor.config.ts` | Default production URL |

## Firebase (phone login)

Add these to **Firebase Console → Authentication → Settings → Authorized domains**:

- `pranjay.com`
- `localhost`
- `localhost` (Capacitor Android uses `https://localhost` internally — add if login fails)

See [docs/FIREBASE_ANDROID.md](./docs/FIREBASE_ANDROID.md).

## iOS (iPhone testing)

See **[docs/IOS_TESTING.md](./docs/IOS_TESTING.md)** for step-by-step iPhone setup (Xcode, CocoaPods, signing).

Quick start:

```bash
cd mobile
npm install
npm run ios:open   # sync + open Xcode → Run on your iPhone
```

## Plugins included

- `@capacitor/splash-screen` — branded launch screen
- `@capacitor/status-bar` — light status bar
- `@capacitor/haptics` — tap feedback on add-to-cart (via web layer)
- `@capacitor/app` — app lifecycle

## Release builds

See [RELEASE.md](./RELEASE.md) for signed AAB and Play Store steps.
