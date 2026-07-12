#!/bin/bash
set -euo pipefail

# Script to build the AFFiNITe Desktop AppImage
# Run from the project root: ./build-appimage.sh

echo "=== Building AFFiNITe AppImage ==="

# Step 1: Compile Electron app renderer and main assets
echo "[1/5] Compiling Electron build assets..."
BUILD_TYPE=canary PUBLIC_PATH="/" yarn affine @affine/electron build
BUILD_TYPE=canary PUBLIC_PATH="/" yarn affine @affine/electron generate-assets

# Step 2: Package using manual packager
echo "[2/5] Running manual-package script..."
BUILD_TYPE=canary bash packages/frontend/apps/electron/scripts/manual-package.sh

# Step 3: Pack ASAR
echo "[3/5] Packing ASAR archive..."
OUT_DIR="packages/frontend/apps/electron/out/canary/AFFiNITe-canary-linux-x64"
npx @electron/asar pack "${OUT_DIR}/resources/app" "${OUT_DIR}/resources/app.asar"
rm -rf "${OUT_DIR}/resources/app"

# Step 4: Rebuild AppDir
echo "[4/5] Rebuilding AppDir structure..."
APPDIR="/tmp/AFFiNITe-canary.AppDir"
rm -rf "${APPDIR}"
mkdir -p "${APPDIR}/usr/bin" "${APPDIR}/usr/lib" "${APPDIR}/usr/share/icons/hicolor/512x512/apps"
cp -r "${OUT_DIR}"/* "${APPDIR}/usr/lib/"

cat > "${APPDIR}/usr/bin/affinite-canary" << 'WRAPPER'
#!/bin/bash
HERE="$(dirname "$(dirname "$(readlink -f "$0")")")"
exec "${HERE}/lib/AFFiNITe-canary" "$@" --no-sandbox
WRAPPER
chmod +x "${APPDIR}/usr/bin/affinite-canary"

cat > "${APPDIR}/AppRun" << 'APPRUN'
#!/bin/bash
HERE="$(dirname "$(readlink -f "$0")")"
exec "${HERE}/usr/bin/affinite-canary" "$@"
APPRUN
chmod +x "${APPDIR}/AppRun"

cat > "${APPDIR}/affinite-canary.desktop" << 'DESKTOP'
[Desktop Entry]
Name=AFFiNITe Canary
Exec=affinite-canary %U
Terminal=false
Type=Application
Icon=affinite-canary
Categories=Office;WordProcessor;
MimeType=x-scheme-handler/affinite-canary;
StartupWMClass=AFFiNITe-canary
DESKTOP

ICON_SRC="packages/frontend/apps/electron/resources/icons/icon_canary_512x512.png"
if [ -f "${ICON_SRC}" ]; then
  cp "${ICON_SRC}" "${APPDIR}/affinite-canary.png"
  cp "${ICON_SRC}" "${APPDIR}/usr/share/icons/hicolor/512x512/apps/affinite-canary.png"
fi

# Step 5: Run appimagetool
echo "[5/5] Generating AppImage..."
if [ ! -f /tmp/appimagetool ]; then
  curl -fsSL -o /tmp/appimagetool https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage
  chmod +x /tmp/appimagetool
fi
ARCH=x86_64 /tmp/appimagetool --comp zstd /tmp/AFFiNITe-canary.AppDir packages/frontend/apps/electron/out/AFFiNITe-canary-linux-x86_64.AppImage

echo "=== AppImage build complete! ==="
echo "Output: packages/frontend/apps/electron/out/AFFiNITe-canary-linux-x86_64.AppImage"
