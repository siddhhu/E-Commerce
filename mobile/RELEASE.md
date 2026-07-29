# Pranjay Android — Release Guide

## Device test matrix (before Play Store)

Test on a **physical Android device** (payments and OTP unreliable on emulators).

| # | Flow | Expected |
|---|------|----------|
| 1 | Cold launch | Splash → homepage loads |
| 2 | Bottom nav | Home, Shop, Cart, Orders, Profile navigate correctly |
| 3 | Search | Focus search → typeahead results appear |
| 4 | Product filters | Mobile filter sheet opens, filters apply |
| 5 | PDP | Variants, images, add to cart |
| 6 | Login | Phone OTP completes (visible reCAPTCHA in app) |
| 7 | Cart + checkout | Address, promo, order summary |
| 8 | Razorpay | Online payment completes, order in Orders tab |
| 9 | COD Bihar | COD allowed for Bihar address |
| 10 | COD other states | COD disabled, online only |
| 11 | Orders | Order detail page loads |

## Debug APK (sideload)

```bash
cd mobile
npm install
npm run build:apk
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

Share `app-debug.apk` via Drive for internal testers.

## Signed release AAB (Play Store)

### 1. Create upload keystore (once)

```bash
keytool -genkey -v -keystore pranjay-upload.keystore -alias pranjay -keyalg RSA -keysize 2048 -validity 10000
```

Store the keystore and passwords **outside the repo** (password manager).

### 2. Configure signing

Create `mobile/android/keystore.properties` (gitignored):

```properties
storeFile=../../pranjay-upload.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=pranjay
keyPassword=YOUR_KEY_PASSWORD
```

Add signing config to `android/app/build.gradle` (see Android docs for `signingConfigs.release`).

### 3. Build AAB

```bash
cd mobile
npm run cap:sync
npm run android:release
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

## Google Play Console

1. Create developer account ($25 one-time): https://play.google.com/console
2. **Create app** → Pranjay → Shopping
3. **Internal testing** → upload AAB → add tester emails
4. **Store listing**:
   - Short description: Cosmetics & wholesale beauty deals
   - Full description: highlight live discounts, Bihar COD, Razorpay
   - Privacy policy URL: `https://pranjay.com/privacy`
   - Screenshots: 375×812 (Home, Shop, PDP, Cart, Checkout, Orders)
   - Feature graphic: 1024×500
5. **Data safety**: phone number, address, payment info (processed via Razorpay)
6. Promote: Internal → Closed → Production

## Backend checklist for app launch

- [ ] `CORS_ORIGINS` includes Capacitor origins (done in `backend/app/config.py`)
- [ ] Firebase authorized domains updated
- [ ] Frontend deployed on Vercel with `NEXT_PUBLIC_API_URL` pointing to your backend
- [ ] Razorpay key hardcoded in checkout (env override optional later)
