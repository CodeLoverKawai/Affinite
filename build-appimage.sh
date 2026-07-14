#!/bin/bash
set -euo pipefail

# Script to build the AFFiNITe Desktop AppImage (Canary or Stable)
# Run from the project root: ./build-appimage.sh [canary|stable]

BUILD_TYPE=${1:-stable}

if [ "$BUILD_TYPE" != "stable" ] && [ "$BUILD_TYPE" != "canary" ]; then
  echo "❌ Error: Invalid build type '$BUILD_TYPE'. Must be 'stable' or 'canary'."
  exit 1
fi

echo "=== Building AFFiNITe AppImage ($BUILD_TYPE) ==="

# Step 1: Compile Electron app renderer and main assets
echo "[1/5] Compiling Electron build assets..."
BUILD_TYPE=$BUILD_TYPE PUBLIC_PATH="/" yarn affine @affine/electron build
BUILD_TYPE=$BUILD_TYPE PUBLIC_PATH="/" yarn affine @affine/electron generate-assets

# Step 2: Package using manual packager
echo "[2/5] Running manual-package script..."
BUILD_TYPE=$BUILD_TYPE bash packages/frontend/apps/electron/scripts/manual-package.sh

# Step 3: Pack ASAR
echo "[3/5] Packing ASAR archive..."
if [ "$BUILD_TYPE" = "canary" ]; then
  OUT_DIR="packages/frontend/apps/electron/out/canary/AFFiNITe-canary-linux-x64"
  APP_BIN_NAME="AFFiNITe-canary"
  APPIMAGE_OUT_NAME="AFFiNITe-canary-linux-x86_64.AppImage"
  DESKTOP_NAME="AFFiNITe Canary"
  DESKTOP_FILE="affinite-canary.desktop"
  ICON_NAME="affinite-canary"
  ICON_SRC="icon_canary_512x512.png"
else
  OUT_DIR="packages/frontend/apps/electron/out/stable/AFFiNITe-stable-linux-x64"
  APP_BIN_NAME="AFFiNITe"
  APPIMAGE_OUT_NAME="AFFiNITe-linux-x86_64.AppImage"
  DESKTOP_NAME="AFFiNITe"
  DESKTOP_FILE="affinite.desktop"
  ICON_NAME="affinite"
  ICON_SRC="icon_stable_512x512.png"
fi

npx @electron/asar pack "${OUT_DIR}/resources/app" "${OUT_DIR}/resources/app.asar"
rm -rf "${OUT_DIR}/resources/app"

# Step 4: Rebuild AppDir
echo "[4/5] Rebuilding AppDir structure..."
APPDIR="/tmp/${APP_BIN_NAME}.AppDir"
rm -rf "${APPDIR}"
mkdir -p "${APPDIR}/usr/bin" "${APPDIR}/usr/lib" "${APPDIR}/usr/share/icons/hicolor/512x512/apps"
cp -r "${OUT_DIR}"/* "${APPDIR}/usr/lib/"

cat > "${APPDIR}/usr/bin/${ICON_NAME}" << WRAPPER
#!/bin/bash
HERE="\$(dirname "\$(dirname "\$(readlink -f "\$0")")")"
exec "\${HERE}/lib/${APP_BIN_NAME}" "\$@" --no-sandbox
WRAPPER
chmod +x "${APPDIR}/usr/bin/${ICON_NAME}"

cat > "${APPDIR}/AppRun" << APPRUN
#!/bin/bash
HERE="\$(dirname "\$(readlink -f "\$0")")"
exec "\${HERE}/usr/bin/${ICON_NAME}" "\$@"
APPRUN
chmod +x "${APPDIR}/AppRun"

cat > "${APPDIR}/${DESKTOP_FILE}" << DESKTOP
[Desktop Entry]
Name=${DESKTOP_NAME}
Exec=${ICON_NAME} %U
Terminal=false
Type=Application
Icon=${ICON_NAME}
Categories=Office;WordProcessor;
MimeType=x-scheme-handler/${ICON_NAME};
StartupWMClass=${APP_BIN_NAME}
DESKTOP

ICON_PATH="packages/frontend/apps/electron/resources/icons/${ICON_SRC}"
if [ -f "${ICON_PATH}" ]; then
  cp "${ICON_PATH}" "${APPDIR}/${ICON_NAME}.png"
  cp "${ICON_PATH}" "${APPDIR}/usr/share/icons/hicolor/512x512/apps/${ICON_NAME}.png"
fi

# Step 5: Run appimagetool
echo "[5/5] Generating AppImage..."
if [ ! -f /tmp/appimagetool ]; then
  curl -fsSL -o /tmp/appimagetool https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage
  chmod +x /tmp/appimagetool
fi
ARCH=x86_64 /tmp/appimagetool --comp zstd "${APPDIR}" "packages/frontend/apps/electron/out/${APPIMAGE_OUT_NAME}"

echo "=== AppImage build complete! ==="
echo "Output: packages/frontend/apps/electron/out/${APPIMAGE_OUT_NAME}"
