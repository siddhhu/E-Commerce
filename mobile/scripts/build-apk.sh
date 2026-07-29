#!/usr/bin/env bash
# Use JDK 17 for Gradle — Java 22+ (e.g. OpenJDK 26) breaks Gradle 8.2.x.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/android"

find_java17() {
  is_java17() {
    local java="$1/bin/java"
    [ -x "$java" ] && "$java" -version 2>&1 | head -1 | grep -qE 'version "17\.'
  }

  if [ -n "${JAVA_HOME_17:-}" ] && is_java17 "$JAVA_HOME_17"; then
    echo "$JAVA_HOME_17"
    return 0
  fi
  for p in \
    /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
    /usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home; do
    if is_java17 "$p"; then
      echo "$p"
      return 0
    fi
  done
  if J17="$(/usr/libexec/java_home -v 17 2>/dev/null)" && is_java17 "$J17"; then
    echo "$J17"
    return 0
  fi
  echo "ERROR: JDK 17 required. Install with: brew install openjdk@17" >&2
  exit 1
}

export JAVA_HOME="$(find_java17)"
export PATH="$JAVA_HOME/bin:$PATH"

find_android_sdk() {
  if [ -n "${ANDROID_HOME:-}" ] && [ -d "$ANDROID_HOME/platform-tools" ]; then
    echo "$ANDROID_HOME"
    return 0
  fi
  if [ -n "${ANDROID_SDK_ROOT:-}" ] && [ -d "$ANDROID_SDK_ROOT/platform-tools" ]; then
    echo "$ANDROID_SDK_ROOT"
    return 0
  fi
  for p in \
    "$HOME/Library/Android/sdk" \
    /opt/homebrew/share/android-commandlinetools \
    /usr/local/share/android-commandlinetools; do
    if [ -d "$p/platform-tools" ]; then
      echo "$p"
      return 0
    fi
  done
  echo "ERROR: Android SDK not found. Install Android Studio or: brew install --cask android-commandlinetools" >&2
  exit 1
}

export ANDROID_HOME="$(find_android_sdk)"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > "$ANDROID_DIR/local.properties"

echo "Using Java: $($JAVA_HOME/bin/java -version 2>&1 | head -1)"
echo "Using Android SDK: $ANDROID_HOME"
cd "$ANDROID_DIR"

TASK="${1:-assembleDebug}"
shift || true
./gradlew "$TASK" "$@"

if [ "$TASK" = "assembleDebug" ]; then
  APK="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
  if [ -f "$APK" ]; then
    echo ""
    echo "✓ Debug APK built successfully:"
    echo "  $APK"
  else
    echo "Build finished but APK not found at expected path." >&2
    exit 1
  fi
elif [ "$TASK" = "bundleRelease" ]; then
  AAB="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"
  if [ -f "$AAB" ]; then
    echo ""
    echo "✓ Release AAB built successfully:"
    echo "  $AAB"
  else
    echo "Build finished but AAB not found at expected path." >&2
    exit 1
  fi
fi
