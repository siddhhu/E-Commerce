#!/usr/bin/env bash
# Build a signed, installable Pranjay release APK for testing on a physical phone.
# - JDK 17 (Gradle does not support newer JDKs)
# - arm64-v8a only (smaller, covers modern Android phones)
# - signed with a local test keystore so `adb install` / "Install unknown apps" works
#
# Signing credentials are NOT in this file. They come from keystore/signing.env
# (gitignored) or from the environment (see build-store.sh for the variables).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
KEYSTORE_DIR="$ROOT/keystore"
KEY_ALIAS="${PRANJAY_KEY_ALIAS:-pranjay}"

ENV_FILE="${PRANJAY_SIGNING_ENV:-$KEYSTORE_DIR/signing.env}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

KEYSTORE="${PRANJAY_KEYSTORE:-$KEYSTORE_DIR/pranjay-test.jks}"
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
echo "→ Using JDK: $JAVA_HOME"

SDK="$(find_sdk)"
echo "→ Using Android SDK: $SDK"

mkdir -p "$ROOT/dist" "$KEYSTORE_DIR"

if [ ! -f "$KEYSTORE" ]; then
  echo "→ Creating local test keystore…"
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass:env PRANJAY_STORE_PASS -keypass:env PRANJAY_KEY_PASS \
    -dname "CN=Pranjay Test, OU=Mobile, O=Pranjay, L=Patna, ST=Bihar, C=IN" >/dev/null
fi

echo "→ Generating Android project (expo prebuild)…"
cd "$ROOT"
npx expo prebuild --platform android --no-install

echo "sdk.dir=$SDK" > "$ANDROID_DIR/local.properties"

# Sign release builds with the local test keystore. Prebuild regenerates
# build.gradle, so this patch is applied on every build and is idempotent.
# Passwords arrive through the environment, never on the command line.
python3 - "$ANDROID_DIR/app/build.gradle" "$KEYSTORE" <<'PY'
import os, pathlib, sys
path = pathlib.Path(sys.argv[1])
keystore = sys.argv[2]
store_pass = os.environ["PRANJAY_STORE_PASS"]
key_pass = os.environ["PRANJAY_KEY_PASS"]
alias = os.environ["PRANJAY_KEY_ALIAS"]
text = path.read_text()

if "pranjayTestRelease" not in text:
    signing = f"""
    signingConfigs {{
        pranjayTestRelease {{
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

    release_marker = "        release {"
    idx = text.find(release_marker)
    if idx == -1:
        raise SystemExit("Could not find release build type")
    insert_at = text.find("\n", idx) + 1
    text = text[:insert_at] + "            signingConfig signingConfigs.pranjayTestRelease\n" + text[insert_at:]

path.write_text(text)
print("→ Applied test signing config")
PY

# The Expo template's release block sets signingConfig signingConfigs.debug,
# which would override the block inserted above — point it at the test key.
python3 - "$ANDROID_DIR/app/build.gradle" <<'PY'
import pathlib, re, sys
path = pathlib.Path(sys.argv[1])
text = path.read_text()

try:
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
    block = re.sub(r"signingConfig signingConfigs\.\w+", "signingConfig signingConfigs.pranjayTestRelease", block)
    if "signingConfig signingConfigs.pranjayTestRelease" not in block:
        block = block.replace("release {", "release {\n            signingConfig signingConfigs.pranjayTestRelease", 1)
    text = text[:release] + block + text[end:]
    path.write_text(text)
    print("→ Release build now uses the test keystore")
except ValueError as exc:
    raise SystemExit(f"Could not patch release signing: {exc}")
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

echo "→ Building release APK (arm64-v8a)…"
cd "$ANDROID_DIR"
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon --no-watch-fs

APK="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK" ]; then
  # Some AGP versions suffix the output when signing is configured.
  APK="$(ls "$ANDROID_DIR"/app/build/outputs/apk/release/*.apk 2>/dev/null | head -n 1)"
fi
if [ ! -f "$APK" ]; then
  echo "ERROR: release APK was not produced." >&2
  exit 1
fi

OUT="$ROOT/dist/Pranjay-1.0.3-test.apk"
cp "$APK" "$OUT"
SIZE="$(du -h "$OUT" | cut -f1)"
echo ""
echo "✅ Installable APK: $OUT ($SIZE)"
echo "   Install over USB: adb install -r \"$OUT\""
echo "   Or copy it to your phone and tap it (allow install from this source)."
echo "   Test keystore: $KEYSTORE (alias $KEY_ALIAS)"
