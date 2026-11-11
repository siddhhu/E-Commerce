# Pranjay Native App (Expo / React Native)

**Flipkart-style setup:** this is a **separate mobile app** with its own UI. The website (`frontend/`) is unchanged and deploys independently.

See [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for how web + native coexist without breaking each other.

## vs the Capacitor app (`mobile/`)

| | Capacitor (`mobile/`) | Native app (`pranjay-app/`) |
|--|----------------------|----------------------------|
| UI | Same website in WebView | Custom React Native screens |
| Codebase | Web frontend only | Separate `pranjay-app/` project |
| Backend | Same API | Same API |
| Updates | Deploy web → instant in app | App store release (or OTA with EAS) |
| Feel | Web-like | Truly native navigation & gestures |

Both can coexist. Use native app for Play Store / App Store; keep Capacitor as a lighter option if needed.

## Prerequisites

- Node.js 20+
- [Expo Go](https://expo.dev/go) on your phone (dev), or Android Studio / Xcode (production builds)

## Setup

```bash
cd pranjay-app
npm install
cp .env.example .env   # optional overrides
npm start
```

Scan the QR code with Expo Go (Android) or Camera (iOS).

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `EXPO_PUBLIC_API_URL` | `https://pranjay-backend.onrender.com` | Backend base URL |
| `EXPO_PUBLIC_FIREBASE_*` | Pranjay Firebase project | Phone OTP login |

## Features (v1 — fully interactive)

- Home feed + category shortcuts + search bar
- **Search** — live product search
- Shop with category filters + infinite scroll
- Product detail + variants + share
- Phone login → Firebase → JWT (same as web backend)
- **Server-synced cart** (not local-only)
- **COD checkout** with saved/new address
- **Razorpay online pay** (UPI / card / netbanking) — same API flow as website
- Order history + order detail screen
- **Wishlist** synced via API
- Secure token storage (Expo SecureStore)

## Android (phone)

**Full guide:** [docs/ANDROID_SETUP.md](./docs/ANDROID_SETUP.md)

```bash
cd pranjay-app
npm install
npx expo run:android --device   # USB debugging ON on phone
```

Razorpay needs this **installed app** — not Expo Go.

## iOS (iPhone)

**Full guide:** [docs/IOS_SETUP.md](./docs/IOS_SETUP.md)

Quick start on a Mac with Xcode:

```bash
cd pranjay-app
npm install
npx expo run:ios --device   # installs on your iPhone
```

Razorpay payments require this **dev build** — they do not work in the generic Expo Go app.

## Coming next

- Push notifications for order updates
- Play Store / App Store release via EAS Build

## Project structure

```
pranjay-app/
  app/                 # Expo Router screens
  src/
    lib/api.ts         # Backend client
    store/auth.ts      # JWT + SecureStore
    components/        # Native UI
```

## Backend

No backend changes required for browsing or cart. Auth uses the same `POST /auth/verify-firebase` flow as the website.

Native HTTP clients do not use browser CORS — the API works as-is.
