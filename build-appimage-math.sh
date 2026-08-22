#!/bin/bash
set -euo pipefail

# Set up logging to project logs/ directory
mkdir -p logs
LOG_FILE="logs/build-appimage-math-$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -i "$LOG_FILE") 2>&1
echo "📝 Log file: $LOG_FILE"

BUILD_TYPE="stable"
PRODUCT_NAME="AFFiNITe-Math"
APP_BIN_NAME="AFFiNITe-Math"
APPIMAGE_OUT_NAME="AFFiNITe-Math-linux-x86_64.AppImage"
DESKTOP_NAME="AFFiNITe Math Edition"
DESKTOP_FILE="affinite-math.desktop"
ICON_NAME="affinite-math"
ICON_SRC="icon_stable_512x512.png"

echo "=== Building AFFiNITe Math Edition AppImage ==="
echo "Product: $PRODUCT_NAME"
echo "Target AppImage: $APPIMAGE_OUT_NAME"

# Step 1: Compile Electron app renderer and main assets
echo "[1/5] Compiling Electron build assets..."
BUILD_TYPE=$BUILD_TYPE PUBLIC_PATH="/" yarn affine @affine/electron build
BUILD_TYPE=$BUILD_TYPE PUBLIC_PATH="/" yarn affine @affine/electron generate-assets

# Step 2: Package using manual packager logic for AFFiNITe-Math
echo "[2/5] Packaging Electron app files..."
ELECTRON_DIR="$(pwd)/packages/frontend/apps/electron"
APP_DIR="${ELECTRON_DIR}"
OUT_DIR="${ELECTRON_DIR}/out/math/${PRODUCT_NAME}-linux-x64"
ELECTRON_ZIP="/home/rousseau/.cache/electron/26ab0fe8debddb0d8281e61add684c976a653d398ff4118015560e9c6d4e7c40/electron-v39.2.7-linux-x64.zip"

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

unzip -qo "${ELECTRON_ZIP}" -d "${OUT_DIR}"
if [ -f "${OUT_DIR}/electron" ]; then
  mv "${OUT_DIR}/electron" "${OUT_DIR}/${APP_BIN_NAME}"
fi

RESOURCES_APP="${OUT_DIR}/resources/app"
mkdir -p "${RESOURCES_APP}"

if [ -d "${APP_DIR}/dist" ]; then
  cp -r "${APP_DIR}/dist" "${RESOURCES_APP}/"
fi
cp "${APP_DIR}/package.json" "${RESOURCES_APP}/"
if [ -d "${APP_DIR}/resources" ]; then
  cp -r "${APP_DIR}/resources" "${RESOURCES_APP}/"
fi

# Step 2.5: Copy runtime production node_modules (dereferenced, no broken symlinks)
echo "[2.5/5] Bundling runtime dependencies into package..."
node -e '
const fs = require("fs");
const path = require("path");

const rootNodeModules = path.resolve("./node_modules");
const targetNodeModules = path.resolve(process.argv[1]);
const electronPkg = require("./packages/frontend/apps/electron/package.json");
const visited = new Set();

function collectDeps(pkgName) {
  if (visited.has(pkgName)) return;
  visited.add(pkgName);

  const pkgJsonPath = path.join(rootNodeModules, pkgName, "package.json");
  if (!fs.existsSync(pkgJsonPath)) return;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    const deps = Object.keys(pkg.dependencies || {});
    for (const dep of deps) {
      collectDeps(dep);
    }
  } catch (e) {}
}

for (const dep of Object.keys(electronPkg.dependencies || {})) {
  collectDeps(dep);
}
collectDeps("semver");
collectDeps("electron-updater");
collectDeps("yjs");
collectDeps("lib0");

fs.mkdirSync(targetNodeModules, { recursive: true });

for (const pkg of visited) {
  const src = path.join(rootNodeModules, pkg);
  const dest = path.join(targetNodeModules, pkg);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true, dereference: true });
  }
}
console.log("Successfully copied", visited.size, "runtime dependencies to", targetNodeModules);
' "${RESOURCES_APP}/node_modules"

if [ -f "${APP_DIR}/resources/app-update.yml" ]; then
  cp "${APP_DIR}/resources/app-update.yml" "${OUT_DIR}/resources/"
fi

# Step 3: Pack ASAR
echo "[3/5] Packing ASAR archive..."
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

OUTPUT_PATH="$(pwd)/packages/frontend/apps/electron/out/${APPIMAGE_OUT_NAME}"
ROOT_COPY="$(pwd)/${APPIMAGE_OUT_NAME}"
rm -f "${OUTPUT_PATH}" "${ROOT_COPY}"

ARCH=x86_64 /tmp/appimagetool --comp zstd "${APPDIR}" "${OUTPUT_PATH}"
cp "${OUTPUT_PATH}" "${ROOT_COPY}"

echo "=== AppImage build complete! ==="
echo "Output: ${OUTPUT_PATH}"
echo "Root Copy: ${ROOT_COPY}"
