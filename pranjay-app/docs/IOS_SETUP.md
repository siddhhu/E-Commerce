# Running Pranjay on iPhone (iOS)

The native app is **separate from the website** (Flipkart-style). To use it on your iPhone you need a **development or production build** — not the generic Expo Go app for full features (especially **Razorpay payments**).

## Why Razorpay wasn’t in the first version

The website uses Razorpay’s **JavaScript** checkout (`checkout.razorpay.com`). The native app must use **`react-native-razorpay`** — a native SDK. That SDK:

- Is now integrated (same backend flow: `prepare` → pay → `complete`)
- **Does not run inside Expo Go** (no native payment module)
- Requires building the app once on a Mac with Xcode, or using EAS Build in the cloud

Your **website is unchanged** and still uses Razorpay as before.

---

## Option A — Your Mac + iPhone (recommended for testing)

### Prerequisites

- Mac with **Xcode** installed ([Mac App Store](https://apps.apple.com/app/xcode/id497799835))
- iPhone USB cable (or same Wi‑Fi for wireless debugging)
- Apple ID (free is enough for device testing)

### Steps

```bash
cd pranjay-app
npm install

# Build & install on connected iPhone (first run takes ~10–15 min)
npx expo run:ios --device
```

1. Xcode may ask you to **sign the app** — select your Apple ID under Signing & Capabilities.
2. On iPhone: **Settings → General → VPN & Device Management** → trust the developer profile.
3. The **Pranjay** app icon appears on your home screen.

### Daily development

```bash
cd pranjay-app
npx expo start --dev-client
```

Open the installed Pranjay app (not Expo Go) — it connects to Metro for hot reload.

---

## Option B — iOS Simulator (no physical iPhone)

```bash
cd pranjay-app
npx expo run:ios
```

Opens in the iPhone simulator on your Mac. Razorpay test mode works; UPI apps won’t be installed on simulator.

---

## Option C — TestFlight / App Store (production)

Uses **EAS Build** (Expo’s cloud builders — works even without a Mac for the build step):

```bash
npm install -g eas-cli
eas login
cd pranjay-app
eas build:configure
eas build --platform ios --profile production
```

Then upload to **App Store Connect** → TestFlight → install on your iPhone.

---

## Expo Go vs dev build

| Feature | Expo Go (QR scan) | Dev build (`expo run:ios`) |
|---------|-------------------|----------------------------|
| Browse / search | ✅ | ✅ |
| Login (phone OTP) | ✅ | ✅ |
| Cart / orders | ✅ | ✅ |
| COD checkout | ✅ | ✅ |
| **Razorpay (UPI/card)** | ❌ | ✅ |

---

## Environment

Copy `.env.example` to `.env`:

```bash
EXPO_PUBLIC_API_URL=https://pranjay-backend.onrender.com
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_SZO4iQslfD86WW
```

Same public Razorpay key as the website.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| “Razorpay requires dev build” | Don’t use Expo Go; run `npx expo run:ios --device` |
| Xcode signing error | Open `ios/` in Xcode → set Team to your Apple ID |
| Firebase OTP fails | Add iOS bundle ID `com.pranjay.shop` in Firebase Console |
| UPI apps don’t open on iOS | Rebuild after `app.json` UPI schemes (already configured) |

---

## Android (for reference)

```bash
cd pranjay-app
npx expo run:android --device
```

Same Razorpay flow as iOS; install APK on your Android phone.
