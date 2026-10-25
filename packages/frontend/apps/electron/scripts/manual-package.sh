#!/bin/bash
set -euo pipefail

# Manual packaging script for AFFiNE Electron on Linux x64
# Bypasses extract-zip bug on Node v24

BUILD_TYPE="${BUILD_TYPE:-canary}"
PRODUCT_NAME="AFFiNITe-${BUILD_TYPE}"
ELECTRON_DIR="/home/rousseau/Documents/GitHub/Affinite/packages/frontend/apps/electron"
APP_DIR="${ELECTRON_DIR}"
OUT_DIR="${ELECTRON_DIR}/out/${BUILD_TYPE}/${PRODUCT_NAME}-linux-x64"
ELECTRON_ZIP="/home/rousseau/.cache/electron/26ab0fe8debddb0d8281e61add684c976a653d398ff4118015560e9c6d4e7c40/electron-v39.2.7-linux-x64.zip"

echo "=== AFFiNE Manual Packager ==="
echo "BUILD_TYPE: ${BUILD_TYPE}"
echo "PRODUCT_NAME: ${PRODUCT_NAME}"
echo "OUT_DIR: ${OUT_DIR}"

# Step 1: Clean and create output directory
echo ""
echo "[1/6] Cleaning output directory..."
rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

# Step 2: Extract Electron binary using system unzip (bypasses Node extract-zip bug)
echo "[2/6] Extracting Electron v39.2.7..."
unzip -qo "${ELECTRON_ZIP}" -d "${OUT_DIR}"
rm -f "${OUT_DIR}/LICENSES.chromium.html"
if [ -d "${OUT_DIR}/locales" ]; then
  find "${OUT_DIR}/locales" -maxdepth 1 -type f -name "*.pak" \
    ! -name "en-US.pak" \
    ! -name "en-GB.pak" \
    ! -name "es.pak" \
    ! -name "es-419.pak" \
    -delete
fi
echo "  Electron extracted (trimmed): $(du -sh "${OUT_DIR}" | cut -f1)"

# Step 3: Rename the electron binary to product name
echo "[3/6] Renaming electron binary to ${PRODUCT_NAME}..."
if [ -f "${OUT_DIR}/electron" ]; then
  mv "${OUT_DIR}/electron" "${OUT_DIR}/${PRODUCT_NAME}"
fi

# Step 4: Copy app source into resources/app
echo "[4/6] Copying application files..."
RESOURCES_APP="${OUT_DIR}/resources/app"
mkdir -p "${RESOURCES_APP}"

# Clean stale TypeScript build outputs before copying dist/
rm -rf "${ELECTRON_DIR}/dist/main" \
       "${ELECTRON_DIR}/dist/helper" \
       "${ELECTRON_DIR}/dist/preload" \
       "${ELECTRON_DIR}/dist/shared" \
       "${ELECTRON_DIR}/dist/tsconfig.tsbuildinfo"
if [ -d "${ELECTRON_DIR}/dist" ]; then
  find "${ELECTRON_DIR}/dist" \( -name "*.map" -o -name "*.d.ts" -o -name "*.tsbuildinfo" \) -delete
fi

# Copy dist (compiled electron app code)
if [ -d "${APP_DIR}/dist" ]; then
  cp -r "${APP_DIR}/dist" "${RESOURCES_APP}/"
  echo "  Copied dist: $(du -sh "${RESOURCES_APP}/dist" | cut -f1)"
fi

# Copy package.json
cp "${APP_DIR}/package.json" "${RESOURCES_APP}/"

# Sync freshly compiled electron-renderer/dist into resources/web-static if available
ELECTRON_RENDERER_DIST="/home/rousseau/Documents/GitHub/Affinite/packages/frontend/apps/electron-renderer/dist"
if [ -d "${ELECTRON_RENDERER_DIST}" ]; then
  echo "  Syncing electron-renderer/dist into resources/web-static..."
  mkdir -p "${APP_DIR}/resources/web-static"
  cp -r "${ELECTRON_RENDERER_DIST}/." "${APP_DIR}/resources/web-static/"
fi

# Ensure Anx Foliate-js reader is bundled into web-static/foliate
ANX_FOLIATE_SRC="/home/rousseau/Documents/GitHub/Anx-Remix/assets/foliate-js"
if [ -d "${ANX_FOLIATE_SRC}/dist" ]; then
  mkdir -p "${APP_DIR}/resources/web-static/foliate"
  cp -r "${ANX_FOLIATE_SRC}/dist" "${ANX_FOLIATE_SRC}/src" "${ANX_FOLIATE_SRC}/index.html" "${APP_DIR}/resources/web-static/foliate/"
  echo "  Bundled Anx Foliate-js reader into resources/web-static/foliate"
fi

# Ensure Anx-Remix Web build is bundled into web-static/anx
ANX_WEB_SRC="/home/rousseau/Documents/GitHub/Anx-Remix/build/web"
if [ -d "${ANX_WEB_SRC}" ]; then
  mkdir -p "${APP_DIR}/resources/web-static/anx"
  cp -r "${ANX_WEB_SRC}/." "${APP_DIR}/resources/web-static/anx/"
  echo "  Bundled Anx-Remix Web into resources/web-static/anx"
fi

# Copy resources (strip source maps from web-static first)
if [ -d "${APP_DIR}/resources/web-static" ]; then
  find "${APP_DIR}/resources/web-static" -name "*.map" -delete
fi
if [ -d "${APP_DIR}/resources" ]; then
  cp -r "${APP_DIR}/resources" "${RESOURCES_APP}/"
fi

# Step 5: Copy node_modules (external runtime dependencies only)
echo "[5/6] Copying runtime node_modules..."
TARGET_NODE_MODULES="${RESOURCES_APP}/node_modules"
node -e '
const fs = require("fs");
const path = require("path");

const rootNodeModules = path.resolve("./node_modules");
const targetNodeModules = path.resolve(process.argv[1]);
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

// Only copy external runtime dependencies required by dist/main.js
const runtimeRootDeps = [
  "electron-updater",
  "yjs",
  "semver",
  "builder-util-runtime",
  "lazy-val",
  "tiny-typed-emitter",
  "lodash.isequal",
  "sax",
  "js-yaml",
  "argparse",
  "lib0",
];
for (const dep of runtimeRootDeps) {
  collectDeps(dep);
}

fs.mkdirSync(targetNodeModules, { recursive: true });

for (const pkg of visited) {
  const src = path.join(rootNodeModules, pkg);
  const dest = path.join(targetNodeModules, pkg);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true, dereference: true });
  }
}
console.log("Successfully copied", visited.size, "runtime dependencies to", targetNodeModules);
' "${TARGET_NODE_MODULES}"

# Strip all *.map, *.d.ts, and *.tsbuildinfo files from resources/app
find "${OUT_DIR}/resources/app" \( -name "*.map" -o -name "*.d.ts" -o -name "*.tsbuildinfo" \) -delete

# Step 6: Copy extra resources
echo "[6/6] Copying extra resources..."
if [ -f "${APP_DIR}/resources/app-update.yml" ]; then
  cp "${APP_DIR}/resources/app-update.yml" "${OUT_DIR}/resources/"
fi

echo ""
echo "=== Package complete ==="
echo "Output: ${OUT_DIR}"
echo "Size: $(du -sh "${OUT_DIR}" | cut -f1)"
echo ""
echo "To create ASAR archive, run:"
echo "  npx @electron/asar pack ${RESOURCES_APP} ${OUT_DIR}/resources/app.asar --unpack \"*.node\""
echo "  rm -rf ${RESOURCES_APP}"
