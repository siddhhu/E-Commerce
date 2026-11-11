#!/usr/bin/env bash
# Build the Play Store artefacts for Pranjay:
#   • dist/Pranjay-<version>.aab  → the file you upload to Google Play
#   • dist/Pranjay-<version>.apk  → the same code, installable for a final check
#
# The AAB is signed with the upload key in keystore/pranjay-test.jks. Google Play
# re-signs every install with the Play App Signing key, so the SHA-1/SHA-256 of
# the Play App Signing certificate must also be registered in Firebase before
# phone-OTP login works in the store build.
#
# Signing credentials are NOT in this file. They come from keystore/signing.env
# (gitignored) or from the environment:
#   PRANJAY_STORE_PASS  keystore password          (required)
#   PRANJAY_KEY_PASS    key password               (defaults to store password)
#   PRANJAY_KEY_ALIAS   key alias                   (defaults to "pranjay")
#   PRANJAY_KEYSTORE    path to the .jks            (defaults to keystore/pranjay-test.jks)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
KEY_ALIAS="${PRANJAY_KEY_ALIAS:-pranjay}"

ENV_FILE="${PRANJAY_SIGNING_ENV:-$ROOT/keystore/signing.env}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

KEYSTORE="${PRANJAY_KEYSTORE:-$ROOT/keystore/pranjay-test.jks}"
STORE_PASS="${PRANJAY_STORE_PASS:-}"
KEY_PASS="${PRANJAY_KEY_PASS:-${PRANJAY_STORE_PASS:-}}"

if [ -z "$STORE_PASS" ]; then
  echo "ERROR: signing password not set." >&2
  echo "       Create $ENV_FILE containing PRANJAY_STORE_PASS=… (it is gitignored)," >&2
  echo "       or export PRANJAY_STORE_PASS before running this script." >&2
  exit 1
fi
export PRANJAY_STORE_PASS="$STORE_PASS"
export PRANJAY_KEY_PASS="$KEY_PASS"
export PRANJAY_KEY_ALIAS="$KEY_ALIAS"

find_java17() {
  for p in \
    /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
    /usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home; do
    if [ -x "$p/bin/java" ]; then echo "$p"; return 0; fi
  done
  /usr/libexec/java_home -v 17 2>/dev/null || true
}

find_sdk() {
  for p in \
    "${ANDROID_HOME:-}" \
    "${ANDROID_SDK_ROOT:-}" \
    "$HOME/Library/Android/sdk" \
    /opt/homebrew/share/android-commandlinetools; do
    [ -n "$p" ] && [ -d "$p/platform-tools" ] && echo "$p" && return 0
  done
  echo "ERROR: Android SDK not found." >&2
  exit 1
}

JAVA_HOME="$(find_java17)"
if [ -z "$JAVA_HOME" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  echo "ERROR: JDK 17 not found. Install with: brew install openjdk@17" >&2
  exit 1
fi
export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"

SDK="$(find_sdk)"
VERSION="$(python3 -c "import json;print(json.load(open('$ROOT/app.json'))['expo']['version'])")"
VERSION_CODE="$(python3 -c "import json;print(json.load(open('$ROOT/app.json'))['expo']['android']['versionCode'])")"

mkdir -p "$ROOT/dist"

if [ ! -f "$KEYSTORE" ]; then
  echo "ERROR: upload keystore missing at $KEYSTORE" >&2
  echo "       Create one with: keytool -genkeypair -keystore keystore/pranjay-upload.jks ..." >&2
  exit 1
fi

echo "→ Pranjay $VERSION (versionCode $VERSION_CODE)"
echo "→ Generating Android project (expo prebuild)…"
cd "$ROOT"
npx expo prebuild --platform android --no-install
echo "sdk.dir=$SDK" > "$ANDROID_DIR/local.properties"

# Sign release builds with the upload keystore. Prebuild regenerates
# build.gradle, so this patch runs on every build and is idempotent.
# Passwords arrive through the environment, never on the command line.
python3 - "$ANDROID_DIR/app/build.gradle" "$KEYSTORE" <<'PY'
import os, pathlib, re, sys
path = pathlib.Path(sys.argv[1])
keystore = sys.argv[2]
store_pass = os.environ["PRANJAY_STORE_PASS"]
key_pass = os.environ["PRANJAY_KEY_PASS"]
alias = os.environ["PRANJAY_KEY_ALIAS"]
text = path.read_text()

if "pranjayRelease" not in text:
    signing = f"""
    signingConfigs {{
        pranjayRelease {{
            storeFile file("{keystore}")
            storePassword "{store_pass}"
            keyAlias "{alias}"
            keyPassword "{key_pass}"
        }}
    }}
"""
    marker = "    buildTypes {"
    if marker not in text:
        raise SystemExit("Could not find buildTypes block in build.gradle")
    text = text.replace(marker, signing + marker, 1)
    path.write_text(text)
    print("→ Applied upload signing config")

text = path.read_text()
build_types = text.index("buildTypes {")
release = text.index("release {", build_types)
brace = text.index("{", release)
depth = 0
end = len(text)
for i in range(brace, len(text)):
    if text[i] == "{":
        depth += 1
    elif text[i] == "}":
        depth -= 1
        if depth == 0:
            end = i
            break
block = text[release:end]
block = re.sub(r"signingConfig signingConfigs\.\w+", "signingConfig signingConfigs.pranjayRelease", block)
if "signingConfig signingConfigs.pranjayRelease" not in block:
    block = block.replace("release {", "release {\n            signingConfig signingConfigs.pranjayRelease", 1)
path.write_text(text[:release] + block + text[end:])
print("→ Release build now uses the upload keystore")
PY

if ! grep -q "android.enableMinifyInReleaseBuilds" "$ANDROID_DIR/gradle.properties" 2>/dev/null; then
  cat >> "$ANDROID_DIR/gradle.properties" <<'EOF'

# Release build optimisation
android.enableMinifyInReleaseBuilds=true
android.enableShrinkResourcesInReleaseBuilds=true
EOF
fi

if ! grep -q "org.gradle.vfs.watch" "$ANDROID_DIR/gradle.properties" 2>/dev/null; then
  cat >> "$ANDROID_DIR/gradle.properties" <<'EOF'

# Gradle's native file watcher can deadlock on macOS and stall the build
org.gradle.vfs.watch=false
EOF
fi

echo "→ Building release bundle + APK (arm64-v8a)…"
cd "$ANDROID_DIR"
./gradlew bundleRelease assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon --no-watch-fs

AAB="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"
APK="$(ls "$ANDROID_DIR"/app/build/outputs/apk/release/*.apk 2>/dev/null | head -n 1)"

if [ ! -f "$AAB" ]; then
  echo "ERROR: release AAB was not produced." >&2
  exit 1
fi

OUT_AAB="$ROOT/dist/Pranjay-$VERSION.aab"
cp "$AAB" "$OUT_AAB"
echo ""
echo "✅ Play Store upload file: $OUT_AAB ($(du -h "$OUT_AAB" | cut -f1))"

if [ -n "${APK:-}" ] && [ -f "$APK" ]; then
  OUT_APK="$ROOT/dist/Pranjay-$VERSION-release.apk"
  cp "$APK" "$OUT_APK"
  echo "✅ Same build as APK (for a final device check): $OUT_APK ($(du -h "$OUT_APK" | cut -f1))"
  echo "   Install over USB: adb install -r \"$OUT_APK\""
fi

echo ""
echo "Signing certificate of the upload key:"
keytool -list -v -keystore "$KEYSTORE" -alias "$KEY_ALIAS" -storepass:env PRANJAY_STORE_PASS 2>/dev/null \
  | grep -E "SHA1:|SHA256:" | sed 's/^[[:space:]]*/   /'
