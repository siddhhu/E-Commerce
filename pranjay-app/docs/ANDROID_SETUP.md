# Running Pranjay on Android

This is the **native app** in `pranjay-app/` (Flipkart-style — separate from the website).

> **Not** the old WebView APK in `mobile/` — that one just embeds pranjay.com. Use **`pranjay-app`** for the full native experience + Razorpay.

---

## What you need

| Tool | Purpose |
|------|---------|
| Node.js 20+ | Run the project |
| **JDK 17** | Android builds (Java 21+ often breaks Gradle) |
| **Android Studio** | SDK + emulator + device tools |
| Android phone | USB debugging enabled (for real device testing) |

Install Android Studio: https://developer.android.com/studio  
In SDK Manager, install **Android SDK 34** (or whatever Expo 57 expects).

Set environment (add to `~/.zshrc`):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk   # macOS
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

On Windows: `ANDROID_HOME=C:\Users\You\AppData\Local\Android\Sdk`

---

## Option A — Install on your Android phone (recommended)

### 1. Enable developer mode on phone

**Settings → About phone → tap Build number 7 times**  
Then **Settings → Developer options → USB debugging ON**

### 2. Connect phone via USB

Verify PC sees the device:

```bash
adb devices
```

You should see your device listed (not `unauthorized` — accept the prompt on the phone).

### 3. Build & install

```bash
cd pranjay-app
npm install
cp .env.example .env    # optional — defaults work for production API

# First build: generates android/ folder + installs app (~10–15 min)
npx expo run:android --device
```

The **Pranjay** app icon appears on your phone. Open it — not Expo Go.

### 4. Daily development (after first install)

```bash
cd pranjay-app
npm run start:dev
```

Open the **Pranjay** app on your phone (same Wi‑Fi as your computer). Code changes hot-reload.

---

## Option B — Android emulator (no physical phone)

1. Open Android Studio → **Device Manager** → create a virtual device (Pixel 6, API 34).
2. Start the emulator.
3. Run:

```bash
cd pranjay-app
npm install
npx expo run:android
```

---

## Razorpay on Android

| App type | Razorpay UPI/card |
|----------|-------------------|
| **Expo Go** (QR scan only) | ❌ Not supported |
| **Installed dev build** (`expo run:android`) | ✅ Works |

Flow (same as website):

1. Cart → Checkout → **Pay with Razorpay**
2. Backend `POST /checkout/prepare`
3. Native Razorpay screen (UPI, cards, etc.)
4. Backend `POST /checkout/complete`

---

## Environment (optional)

Create `pranjay-app/.env`:

```bash
EXPO_PUBLIC_API_URL=https://pranjay-backend.onrender.com
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_SZO4iQslfD86WW
```

Same public key as the website.

---

## Play Store release (production APK / AAB)

### Local release APK (debug-style, for sharing)

After `npx expo prebuild` (or after first `expo run:android`):

```bash
cd pranjay-app/android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

For signed Play Store builds, use **EAS** (recommended):

```bash
npm install -g eas-cli
eas login
cd pranjay-app
eas build:configure
eas build --platform android --profile production
```

Download the `.aab` from Expo and upload to **Google Play Console**.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `adb: command not found` | Add `platform-tools` to PATH (see above) |
| Device unauthorized | Unplug, revoke USB debugging authorizations on phone, replug, accept prompt |
| Gradle / Java error | Use **JDK 17**: `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` |
| Razorpay “dev build required” | You opened Expo Go — use the installed **Pranjay** app from `expo run:android` |
| OTP / Firebase fails | Add SHA-1 in Firebase Console for package `com.pranjay.shop` |
| App can’t reach API | Phone needs internet; check `EXPO_PUBLIC_API_URL` |

---

## Quick command reference

```bash
cd pranjay-app
npm install
npx expo run:android --device   # install on phone
npm run start:dev                 # hot reload after first install
adb install -r android/app/build/outputs/apk/debug/app-debug.apk   # manual reinstall
```

Package name: **`com.pranjay.shop`** (same as old Capacitor app — only one should be installed at a time if both use the same ID).
