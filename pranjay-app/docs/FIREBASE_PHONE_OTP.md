# Enable Firebase phone OTP in the native Android app

The website's phone-login flow is Firebase Phone Authentication. Android uses a
different Firebase setup from a browser, so the native app must be registered
in the same Firebase project before SMS login can work.

1. In Firebase Console, add an Android app with package name
   `com.pranjay.shop`.
2. Add the SHA-1 and SHA-256 fingerprints for the signing key that will sign
   the installable app and the Play Store release.
3. Download the resulting `google-services.json` and put it at
   `pranjay-app/google-services.json`. Do not commit it if it contains project
   credentials outside your normal repository policy.
4. Enable Phone as a sign-in provider in Firebase Authentication and complete
   Android Play Integrity / reCAPTCHA configuration required by Firebase.

The native app currently does not contain that Android Firebase configuration,
so it cannot safely perform Firebase SMS authentication yet. Email OTP remains
available only as a temporary fallback until these project-side Firebase values
are provided.
