# Firebase setup for Pranjay Android app

Phone login uses Firebase Auth in the WebView, then exchanges the ID token with your backend (`POST /api/v1/auth/verify-firebase`).

## Authorized domains

In [Firebase Console](https://console.firebase.google.com/) → your project → **Authentication** → **Settings** → **Authorized domains**, add:

| Domain | Why |
|--------|-----|
| `pranjay.com` | Production shop |
| `www.pranjay.com` | WWW variant |
| `localhost` | Local dev + Capacitor |

If login fails inside the APK with a domain error, also try adding the exact origin shown in the browser console.

## reCAPTCHA in WebView

The login page uses **visible reCAPTCHA** when running inside the Capacitor app (`isNativeApp()`), because invisible reCAPTCHA often fails in WebViews.

If OTP still fails:

1. Enable **Phone** sign-in provider in Firebase Authentication
2. Add your test phone numbers under **Phone numbers for testing** (dev only)
3. Consider `@capacitor-firebase/authentication` for native OTP (future upgrade)

## Service account (backend)

Backend verification uses `FIREBASE_SERVICE_ACCOUNT_JSON` on Render — unchanged for the mobile app.
