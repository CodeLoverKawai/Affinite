#!/bin/bash
set -euo pipefail

# Ensure script is run from the repository root
cd "$(dirname "$0")"

echo "=== AFFiNITe Release Automation ==="

# Step 1: Detect current version from package.json
VERSION=$(node -p "require('./packages/frontend/core/package.json').version")
TAG="v$VERSION"
echo "Detected Version: $VERSION"
echo "Target Tag: $TAG"

# Step 2: Verify GitHub CLI (gh) installation and authentication
if ! command -v gh &> /dev/null; then
  echo "❌ Error: GitHub CLI ('gh') is not installed."
  echo "Please install it first: sudo apt install gh"
  exit 1
fi

if ! gh auth status &> /dev/null; then
  echo "❌ Error: GitHub CLI ('gh') is not authenticated."
  echo "Please run 'gh auth login' before executing this release script."
  exit 1
fi

# Step 3: Run the AppImage build script
echo ""
echo "--- [1/3] Building Linux AppImage ---"
./build-appimage.sh

# Step 4: Run the APK build script
echo ""
echo "--- [2/3] Building Android APK ---"
./build-apk.sh

# Step 5: Check build outputs
APPIMAGE_PATH="packages/frontend/apps/electron/out/AFFiNITe-canary-linux-x86_64.AppImage"
APK_PATH="packages/frontend/apps/android/App/app/build/outputs/apk/stable/release/AFFINITE-release.apk"

if [ ! -f "$APPIMAGE_PATH" ]; then
  echo "❌ Error: AppImage was not generated at $APPIMAGE_PATH"
  exit 1
fi

if [ ! -f "$APK_PATH" ]; then
  echo "❌ Error: APK was not generated at $APK_PATH"
  exit 1
fi

# Step 6: Create GitHub Release and Upload Assets
echo ""
echo "--- [3/3] Publishing to GitHub Releases ---"
echo "Creating release $TAG and uploading assets..."

gh release create "$TAG" \
  "$APPIMAGE_PATH" \
  "$APK_PATH" \
  --title "AFFiNITe $TAG" \
  --notes "Automated release of AFFiNITe Desktop AppImage (Linux) and Mobile APK (Android)." \
  --generate-notes

echo ""
echo "=== Release $TAG successfully created! ==="
echo "Assets uploaded:"
echo "  - Linux AppImage: $APPIMAGE_PATH"
echo "  - Android APK: $APK_PATH"
