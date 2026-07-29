# Test Pranjay on your iPhone (iOS)

The app loads your live shop (`https://pranjay.com`) inside a native iOS shell — same bottom nav and mobile UX as Android.

## What you need

| Requirement | Notes |
|-------------|--------|
| Mac | iOS builds only work on macOS |
| **Xcode** (full app) | Install from Mac App Store — not Command Line Tools alone |
| **CocoaPods** | `sudo gem install cocoapods` |
| iPhone + USB cable | Or same Wi‑Fi after first USB run |
| Apple ID | Free Apple ID works for personal device testing |

You do **not** need the paid $99/year Apple Developer Program just to test on **your own** iPhone.

---

## One-time Mac setup

### 1. Install Xcode

1. Open **App Store** → search **Xcode** → Install (large download, ~12 GB).
2. Open Xcode once → accept license → let it install extra components.

### 2. Point terminal to Xcode (important)

If you only had Command Line Tools before, run:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -version
```

You should see something like `Xcode 16.x`.

### 3. Install CocoaPods

```bash
sudo gem install cocoapods
pod --version
```

---

## Build and run on your iPhone

From the project root:

```bash
cd mobile
npm install

# Optional: use Vercel preview URL if pranjay.com isn't updated yet
# export CAPACITOR_SERVER_URL=https://your-app.vercel.app

npx cap sync ios
npx cap open ios
```

This opens **Xcode** with the `App` project.

### In Xcode

1. **Connect your iPhone** with USB (unlock the phone, tap Trust This Computer if asked).

2. Top toolbar: click the device dropdown (next to "App") → select **your iPhone** (not a simulator).

3. Left sidebar: click **App** (blue icon) → **Signing & Capabilities** tab:
   - Check **Automatically manage signing**
   - **Team:** choose your Apple ID (add via Xcode → Settings → Accounts if missing)
   - Bundle Identifier: `com.pranjay.shop` (change to `com.yourname.pranjay` if there's a conflict)

4. Press **Run** (▶) or `Cmd + R`.

5. **First install on iPhone:**  
   Settings → **General** → **VPN & Device Management** → trust your developer certificate → open **Pranjay**.

---

## Firebase (phone login on iPhone)

In [Firebase Console](https://console.firebase.google.com/) → **Authentication** → **Settings** → **Authorized domains**, ensure:

- `pranjay.com`
- `localhost`

If OTP fails in the app, check Safari/WebView errors — the login page uses **visible reCAPTCHA** inside the native app.

---

## What to test

Same checklist as Android:

- [ ] App opens to homepage with bottom nav
- [ ] Shop, filters, product detail
- [ ] Add to cart (haptic feedback on device)
- [ ] Phone login + OTP
- [ ] Checkout (Razorpay / COD Bihar rule)
- [ ] Orders list

Use **Safari on the same iPhone** first — if the site is slow there, the app will be slow too.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `xcodebuild requires Xcode` | Install Xcode from App Store; run `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` |
| `pod install` failed | Run `sudo gem install cocoapods`, then `cd mobile/ios/App && pod install` |
| Signing error | Unique Bundle ID + select your Team under Signing |
| App expires after 7 days | Free Apple ID limit — rebuild from Xcode or join Apple Developer Program ($99/yr) |
| Blank white screen | Check internet; confirm `pranjay.com` loads in Safari; try `CAPACITOR_SERVER_URL` |
| Razorpay doesn't open | Test on real device (not simulator); may need native Razorpay SDK later |

---

## Simulator (quick UI check only)

In Xcode device menu, pick **iPhone 15** (simulator). Good for layout — **not** for OTP or payments.

---

## Next: TestFlight / App Store

When ready for others to install on iOS:

1. Apple Developer Program ($99/year)
2. Archive in Xcode → **Product → Archive**
3. Upload to **App Store Connect**
4. **TestFlight** for beta testers, then App Store review

See Apple’s [App Store Connect Help](https://developer.apple.com/help/app-store-connect/).
