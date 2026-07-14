#!/bin/bash
set -euo pipefail

# Ensure script is run from the repository root
cd "$(dirname "$0")"

echo "=== AFFiNITe Release Automation ==="

# Read current version from root package.json
VERSION=$(node -p "require('./package.json').version")
echo "Current Version: $VERSION"

# Prompt user for the new version
read -p "Enter new version (or press Enter to auto-bump patch version): " NEW_VERSION

if [ -z "$NEW_VERSION" ]; then
  # Auto-bump patch version (e.g., 0.26.3 -> 0.26.4)
  NEW_VERSION=$(node -e "
    const v = '$VERSION'.split('.');
    v[2] = parseInt(v[2], 10) + 1;
    console.log(v.join('.'));
  ")
fi

echo "Updating version in package.json files to: $NEW_VERSION..."

# Write new version to all three package.json files
node -e "
  const fs = require('fs');
  const files = [
    'package.json',
    'packages/frontend/core/package.json',
    'packages/frontend/apps/electron/package.json'
  ];
  for (const file of files) {
    if (fs.existsSync(file)) {
      const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
      pkg.version = '$NEW_VERSION';
      fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
      console.log('  Updated: ' + file);
    }
  }
"

TAG="v$NEW_VERSION"
echo "Target Tag: $TAG"

# Verify GitHub CLI (gh) installation and authentication
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

# Commit the version bump to Git
echo "Committing version bump to Git..."
git add package.json packages/frontend/core/package.json packages/frontend/apps/electron/package.json
git commit -m "chore: Bump version to $NEW_VERSION" || true

# Run the AppImage build script
echo ""
echo "--- [1/3] Building Linux AppImage (Stable) ---"
./build-appimage.sh stable

# Run the APK build script
echo ""
echo "--- [2/3] Building Android APK (Stable) ---"
./build-apk.sh

# Check build outputs
APPIMAGE_PATH="packages/frontend/apps/electron/out/AFFiNITe-linux-x86_64.AppImage"
APK_PATH="packages/frontend/apps/android/App/app/build/outputs/apk/stable/release/AFFINITE-release.apk"

if [ ! -f "$APPIMAGE_PATH" ]; then
  echo "❌ Error: AppImage was not generated at $APPIMAGE_PATH"
  exit 1
fi

if [ ! -f "$APK_PATH" ]; then
  echo "❌ Error: APK was not generated at $APK_PATH"
  exit 1
fi

# Create GitHub Release and Upload Assets
echo ""
echo "--- [3/3] Publishing to GitHub Releases ---"
echo "Creating release $TAG and uploading assets..."

# Push commits to remote origin
git push origin || true

gh release create "$TAG" \
  "$APPIMAGE_PATH" \
  "$APK_PATH" \
  --title "AFFiNITe $TAG" \
  --notes "Release of AFFiNITe Desktop AppImage (Linux) and Mobile APK (Android) v$NEW_VERSION." \
  --generate-notes

echo ""
echo "=== Release $TAG successfully created! ==="
echo "Assets uploaded:"
echo "  - Linux AppImage: $APPIMAGE_PATH"
echo "  - Android APK: $APK_PATH"
