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

# Step 5: Copy node_modules (hoisted from monorepo root)
echo "[5/6] Copying node_modules (this may take a while)..."
MONOREPO_ROOT="/home/rousseau/Documents/GitHub/Affinite"

if [ -d "${APP_DIR}/node_modules" ] && [ ! -L "${APP_DIR}/node_modules" ]; then
  # Use local node_modules if it exists and is not a symlink
  cp -r "${APP_DIR}/node_modules" "${RESOURCES_APP}/"
else
  # Symlink to monorepo node_modules
  ln -sf "${MONOREPO_ROOT}/node_modules" "${RESOURCES_APP}/node_modules"
fi
echo "  node_modules linked/copied"

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
