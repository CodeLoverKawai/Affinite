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
echo "  Electron extracted: $(du -sh "${OUT_DIR}" | cut -f1)"

# Step 3: Rename the electron binary to product name
echo "[3/6] Renaming electron binary to ${PRODUCT_NAME}..."
if [ -f "${OUT_DIR}/electron" ]; then
  mv "${OUT_DIR}/electron" "${OUT_DIR}/${PRODUCT_NAME}"
fi

# Step 4: Copy app source into resources/app
echo "[4/6] Copying application files..."
RESOURCES_APP="${OUT_DIR}/resources/app"
mkdir -p "${RESOURCES_APP}"

# Copy dist (compiled electron app code)
if [ -d "${APP_DIR}/dist" ]; then
  cp -r "${APP_DIR}/dist" "${RESOURCES_APP}/"
  echo "  Copied dist: $(du -sh "${RESOURCES_APP}/dist" | cut -f1)"
fi

# Copy package.json
cp "${APP_DIR}/package.json" "${RESOURCES_APP}/"

# Copy resources
if [ -d "${APP_DIR}/resources" ]; then
  cp -r "${APP_DIR}/resources" "${RESOURCES_APP}/"
fi

# Step 5: Copy node_modules (production runtime dependencies)
echo "[5/6] Copying runtime node_modules..."
TARGET_NODE_MODULES="${RESOURCES_APP}/node_modules"
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
' "${TARGET_NODE_MODULES}"

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
echo "To create AppImage, run:"
echo "  npx @electron/asar pack ${RESOURCES_APP} ${OUT_DIR}/resources/app.asar"
echo "  rm -rf ${RESOURCES_APP}"
echo "  # Then use appimagetool"
