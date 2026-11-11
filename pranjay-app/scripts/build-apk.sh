#!/usr/bin/env bash
# Debug APK — arm64 only (smaller than fat debug build)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
OUT="$ROOT/dist/Pranjay-native-debug-arm64.apk"

find_java17() {
  for p in \
    /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
    /usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home; do
    if [ -x "$p/bin/java" ]; then echo "$p"; return 0; fi
  done
  /usr/libexec/java_home -v 17 2>/dev/null || true
}

export JAVA_HOME="$(find_java17)"
export PATH="$JAVA_HOME/bin:$PATH"

find_sdk() {
  for p in \
    "${ANDROID_HOME:-}" \
    "${ANDROID_SDK_ROOT:-}" \
    "$HOME/Library/Android/sdk" \
    /opt/homebrew/share/android-commandlinetools; do
    [ -n "$p" ] && [ -d "$p/platform-tools" ] && echo "$p" && return 0
  done
  echo "ERROR: Android SDK not found. Install Android Studio or: brew install android-commandlinetools" >&2
  exit 1
}

SDK="$(find_sdk)"
mkdir -p "$ROOT/dist"

cd "$ROOT"
if [ ! -d android ]; then
  npx expo prebuild --platform android --no-install
fi

echo "sdk.dir=$SDK" > "$ANDROID_DIR/local.properties"

cd "$ANDROID_DIR"
./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a --no-daemon

mkdir -p "$ROOT/dist"
cp "$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk" "$OUT"
echo ""
echo "✅ APK ready: $OUT"
echo "Install: adb install -r \"$OUT\""
