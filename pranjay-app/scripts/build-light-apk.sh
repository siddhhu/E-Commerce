#!/usr/bin/env bash
# Lightweight release APK for phone testing (~35–55 MB, arm64 only, no dev client)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
OUT="$ROOT/dist/Pranjay-light-arm64.apk"

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
export NODE_ENV=production
export EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1

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

SDK="$(find_sdk)"
mkdir -p "$ROOT/dist"

echo "→ Syncing Android project (no dev client)…"
cd "$ROOT"
npx expo prebuild --platform android --clean --no-install

echo "sdk.dir=$SDK" > "$ANDROID_DIR/local.properties"

# Append release shrink settings (survives prebuild when appended after)
if ! grep -q "enableMinifyInReleaseBuilds=true" "$ANDROID_DIR/gradle.properties" 2>/dev/null; then
  cat >> "$ANDROID_DIR/gradle.properties" <<'EOF'

# Lightweight release builds
android.enableMinifyInReleaseBuilds=true
android.enableShrinkResourcesInReleaseBuilds=true
EOF
fi

echo "→ Building release APK (arm64-v8a only, minified)…"
cd "$ANDROID_DIR"
./gradlew assembleRelease \
  -PreactNativeArchitectures=arm64-v8a \
  --no-daemon

RELEASE_APK="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$RELEASE_APK" ]; then
  echo "ERROR: Release APK not found at $RELEASE_APK" >&2
  exit 1
fi

cp "$RELEASE_APK" "$OUT"
SIZE="$(du -h "$OUT" | cut -f1)"
echo ""
echo "✅ Lightweight APK ready: $OUT ($SIZE)"
echo "Install: adb install -r \"$OUT\""
