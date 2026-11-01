#!/bin/bash
set -e

# Directories
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK_DIR="$REPO_DIR/build/app/outputs/flutter-apk"

if [ -d "/usr/lib/jvm/java-21-openjdk" ]; then
  export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
  export PATH="$JAVA_HOME/bin:$PATH"
fi

echo "=== Building Android APKs ==="
flutter build apk --release --split-per-abi --android-skip-build-dependency-validation

# Extract version from pubspec.yaml
VERSION=$(grep '^version: ' "$REPO_DIR/pubspec.yaml" | sed 's/version: //')
echo "=== Detected version: $VERSION ==="

# Clean old APKs in root directory
rm -f "$REPO_DIR"/Anx_Remix-*.apk

# Copy and rename arm64-v8a
ARM64_APK=$(find "$APK_DIR" -name "*arm64-v8a*.apk" | head -n 1)
if [ -n "$ARM64_APK" ]; then
  cp "$ARM64_APK" "$REPO_DIR/Anx_Remix-${VERSION}-arm64-v8a.apk"
  echo "=== APK successfully created at: $REPO_DIR/Anx_Remix-${VERSION}-arm64-v8a.apk ==="
fi

# Copy and rename armeabi-v7a
ARMV7_APK=$(find "$APK_DIR" -name "*armeabi-v7a*.apk" | head -n 1)
if [ -n "$ARMV7_APK" ]; then
  cp "$ARMV7_APK" "$REPO_DIR/Anx_Remix-${VERSION}-armeabi-v7a.apk"
  echo "=== APK successfully created at: $REPO_DIR/Anx_Remix-${VERSION}-armeabi-v7a.apk ==="
fi

# Copy and rename x86_64
X86_64_APK=$(find "$APK_DIR" -name "*x86_64*.apk" | head -n 1)
if [ -n "$X86_64_APK" ]; then
  cp "$X86_64_APK" "$REPO_DIR/Anx_Remix-${VERSION}-x86_64.apk"
  echo "=== APK successfully created at: $REPO_DIR/Anx_Remix-${VERSION}-x86_64.apk ==="
fi

echo "=== All APKs successfully built and renamed! ==="
