#!/bin/bash
set -euo pipefail

# Set up logging to project logs/ directory
mkdir -p logs
LOG_FILE="logs/$(basename "$0" .sh)-$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -i "$LOG_FILE") 2>&1
echo "📝 Log file: $LOG_FILE"

# Script to build the AFFiNITe Android APK
# Run from the project root: ./build-apk.sh

echo "=== Building AFFiNITe Android APK ==="

# Step 1: Build mobile web assets
echo "[1/3] Compiling web assets for Android..."
BUILD_TYPE=stable PUBLIC_PATH="/" yarn affine @affine/android build

# Step 2: Sync Capacitor assets
echo "[2/3] Syncing assets with Capacitor..."
cd packages/frontend/apps/android
npx cap sync android
cd ../../../..

# Step 3: Run Gradle compilation (signed using anx-remix keys)
echo "[3/3] Running Gradle build..."
export PATH=/usr/lib/jvm/java-21-openjdk/bin:$PATH
cd packages/frontend/apps/android/App
./gradlew assembleStableRelease
cd ../../../..

echo "=== APK build complete! ==="
echo "Output: packages/frontend/apps/android/App/app/build/outputs/apk/stable/release/AFFINITE-release.apk"
