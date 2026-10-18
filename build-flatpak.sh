#!/bin/bash
set -euo pipefail

# Set up logging to project logs/ directory
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${REPO_ROOT}"

mkdir -p logs
LOG_FILE="logs/$(basename "$0" .sh)-$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -i "$LOG_FILE") 2>&1
echo "📝 Log file: $LOG_FILE"

# Native Flatpak builder for AFFiNITe Desktop (app.affinite.Affinite)
# Usage: ./build-flatpak.sh [stable|canary|beta] [--rebuild|--build] [--fast] [--no-install]

BUILD_TYPE="stable"
FORCE_REBUILD=0
FAST_MODE=0
NO_INSTALL=0

for arg in "$@"; do
  case "$arg" in
    stable|canary|beta)
      BUILD_TYPE="$arg"
      ;;
    --rebuild|--build)
      FORCE_REBUILD=1
      ;;
    --fast)
      FAST_MODE=1
      ;;
    --no-install)
      NO_INSTALL=1
      ;;
    *)
      echo "❌ Error: Unknown argument '$arg'."
      echo "Usage: $0 [stable|canary|beta] [--rebuild|--build] [--fast] [--no-install]"
      exit 1
      ;;
  esac
done

FLATPAK_ID="app.affinite.Affinite"
APP_BIN_NAME="AFFiNITe-${BUILD_TYPE}"
OUT_DIR="${REPO_ROOT}/packages/frontend/apps/electron/out/${BUILD_TYPE}/${APP_BIN_NAME}-linux-x64"
FLATPAK_BUILD_DIR="${REPO_ROOT}/.flatpak-build"
FLATPAK_REPO_DIR="${REPO_ROOT}/.flatpak-repo"
FLATPAK_BUNDLE="${REPO_ROOT}/AFFiNITe-linux-x86_64.flatpak"

if [ "$BUILD_TYPE" = "canary" ]; then
  DESKTOP_NAME="AFFiNITe Canary"
  ICON_SRC="icon_canary_512x512.png"
elif [ "$BUILD_TYPE" = "beta" ]; then
  DESKTOP_NAME="AFFiNITe Beta"
  ICON_SRC="icon_beta_512x512.png"
else
  DESKTOP_NAME="AFFiNITe"
  ICON_SRC="icon_stable_512x512.png"
fi

echo "=== Building AFFiNITe Flatpak (${FLATPAK_ID} - ${BUILD_TYPE}) ==="

# Step 1: Build or verify Electron assets & ASAR package
if [ "$FORCE_REBUILD" -eq 1 ] || [ ! -d "${OUT_DIR}" ]; then
  echo "[1/5] Building Electron assets and packaging (${BUILD_TYPE})..."
  if [ "${SKIP_WEB_BUILD:-0}" = "1" ]; then
    BUILD_TYPE="${BUILD_TYPE}" PUBLIC_PATH="/" SKIP_WEB_BUILD=1 yarn affine @affine/electron generate-assets
  else
    BUILD_TYPE="${BUILD_TYPE}" PUBLIC_PATH="/" yarn affine @affine/electron generate-assets
  fi
  BUILD_TYPE="${BUILD_TYPE}" bash packages/frontend/apps/electron/scripts/manual-package.sh
  echo "  Packing app.asar (with --unpack \"*.node\")..."
  npx @electron/asar pack "${OUT_DIR}/resources/app" "${OUT_DIR}/resources/app.asar" --unpack "*.node"
  rm -rf "${OUT_DIR}/resources/app"
elif [ "$FAST_MODE" -eq 1 ] && [ -f "${OUT_DIR}/resources/app.asar" ] && [ -d "${OUT_DIR}/resources/app.asar.unpacked" ]; then
  echo "[1/5] Fast mode: reusing existing packaged output at ${OUT_DIR}"
else
  echo "[1/5] Refreshing manual-package and app.asar (--unpack \"*.node\")..."
  BUILD_TYPE="${BUILD_TYPE}" bash packages/frontend/apps/electron/scripts/manual-package.sh
  npx @electron/asar pack "${OUT_DIR}/resources/app" "${OUT_DIR}/resources/app.asar" --unpack "*.node"
  rm -rf "${OUT_DIR}/resources/app"
fi

# Step 2: Detect installed org.freedesktop.Platform / Sdk runtime version
echo "[2/5] Detecting Flatpak Freedesktop runtime..."
RUNTIME_LIST="$(flatpak list --runtime --columns=application,branch 2>/dev/null || true)"
if echo "${RUNTIME_LIST}" | grep -qE 'org\.freedesktop\.Platform[[:space:]]+25\.08'; then
  RUNTIME_VERSION="25.08"
elif echo "${RUNTIME_LIST}" | grep -qE 'org\.freedesktop\.Platform[[:space:]]+24\.08'; then
  RUNTIME_VERSION="24.08"
else
  RUNTIME_VERSION="25.08"
fi
echo "  Using runtime: org.freedesktop.Platform//${RUNTIME_VERSION} (SDK: org.freedesktop.Sdk//${RUNTIME_VERSION})"

# Step 3: Initialize Flatpak build directory and populate /app files
echo "[3/5] Initializing Flatpak build tree..."
rm -rf "${FLATPAK_BUILD_DIR}"
flatpak build-init "${FLATPAK_BUILD_DIR}" "${FLATPAK_ID}" "org.freedesktop.Sdk" "org.freedesktop.Platform" "${RUNTIME_VERSION}"

mkdir -p \
  "${FLATPAK_BUILD_DIR}/files/lib/affinite" \
  "${FLATPAK_BUILD_DIR}/files/bin" \
  "${FLATPAK_BUILD_DIR}/files/share/applications" \
  "${FLATPAK_BUILD_DIR}/files/share/metainfo" \
  "${FLATPAK_BUILD_DIR}/files/share/icons/hicolor/256x256/apps" \
  "${FLATPAK_BUILD_DIR}/files/share/icons/hicolor/512x512/apps"

cp -a "${OUT_DIR}/." "${FLATPAK_BUILD_DIR}/files/lib/affinite/"

cat > "${FLATPAK_BUILD_DIR}/files/bin/affinite" << WRAPPER
#!/bin/sh
export ELECTRON_OZONE_PLATFORM_HINT="\${ELECTRON_OZONE_PLATFORM_HINT:-auto}"
EXTRA_GPU_FLAGS=""
if [ -r /sys/class/drm/renderD128/device/vendor ] && [ "\$(cat /sys/class/drm/renderD128/device/vendor 2>/dev/null)" = "0x10de" ]; then
  for node in renderD129 renderD130; do
    if [ -r "/sys/class/drm/\${node}/device/vendor" ]; then
      vendor="\$(cat "/sys/class/drm/\${node}/device/vendor" 2>/dev/null)"
      if [ "\$vendor" = "0x1002" ] || [ "\$vendor" = "0x8086" ]; then
        EXTRA_GPU_FLAGS="--render-node-override=/dev/dri/\${node}"
        break
      fi
    fi
  done
fi
exec "/app/lib/affinite/${APP_BIN_NAME}" "\$@" --no-sandbox --ozone-platform-hint=auto \${EXTRA_GPU_FLAGS} --enable-features=UseOzonePlatform,WaylandWindowDecorations,VaapiVideoDecodeLinuxGL,CanvasOopRasterization
WRAPPER
chmod +x "${FLATPAK_BUILD_DIR}/files/bin/affinite"

cat > "${FLATPAK_BUILD_DIR}/files/share/applications/${FLATPAK_ID}.desktop" << DESKTOP
[Desktop Entry]
Name=${DESKTOP_NAME}
Comment=Local-first workspace for docs, whiteboards, and databases
Exec=affinite %U
Terminal=false
Type=Application
Icon=${FLATPAK_ID}
Categories=Office;WordProcessor;ProjectManagement;
MimeType=x-scheme-handler/affine;x-scheme-handler/affinite;
StartupWMClass=${APP_BIN_NAME}
StartupNotify=true
DESKTOP

METAINFO_PATH="${REPO_ROOT}/flathub/${FLATPAK_ID}.metainfo.xml"
if [ -f "${METAINFO_PATH}" ]; then
  cp "${METAINFO_PATH}" "${FLATPAK_BUILD_DIR}/files/share/metainfo/${FLATPAK_ID}.metainfo.xml"
fi

ICON_PATH="${REPO_ROOT}/packages/frontend/apps/electron/resources/icons/${ICON_SRC}"
if [ -f "${ICON_PATH}" ]; then
  cp "${ICON_PATH}" "${FLATPAK_BUILD_DIR}/files/share/icons/hicolor/512x512/apps/${FLATPAK_ID}.png"
  if command -v magick >/dev/null 2>&1; then
    magick "${ICON_PATH}" -resize 256x256 "${FLATPAK_BUILD_DIR}/files/share/icons/hicolor/256x256/apps/${FLATPAK_ID}.png"
  else
    cp "${ICON_PATH}" "${FLATPAK_BUILD_DIR}/files/share/icons/hicolor/256x256/apps/${FLATPAK_ID}.png"
  fi
fi

# Step 4: Finalize Flatpak permissions, export OSTree repo, and create .flatpak bundle
echo "[4/5] Finishing Flatpak build and exporting bundle..."
flatpak build-finish "${FLATPAK_BUILD_DIR}" \
  --command=affinite \
  --share=ipc \
  --share=network \
  --socket=wayland \
  --socket=fallback-x11 \
  --socket=pulseaudio \
  --socket=session-bus \
  --socket=system-bus \
  --device=dri \
  --filesystem=xdg-documents \
  --filesystem=xdg-download \
  --filesystem=xdg-pictures \
  --talk-name=org.freedesktop.Notifications \
  --talk-name=org.kde.StatusNotifierWatcher \
  --talk-name=org.freedesktop.Flatpak

rm -rf "${FLATPAK_REPO_DIR}"
flatpak build-export "${FLATPAK_REPO_DIR}" "${FLATPAK_BUILD_DIR}" stable
flatpak build-bundle "${FLATPAK_REPO_DIR}" "${FLATPAK_BUNDLE}" "${FLATPAK_ID}" stable

# Clean up temporary build and OSTree directories
rm -rf "${FLATPAK_BUILD_DIR}" "${FLATPAK_REPO_DIR}"

echo "  Bundle created: ${FLATPAK_BUNDLE} ($(du -sh "${FLATPAK_BUNDLE}" | cut -f1))"

# Step 5: Install into user's Flatpak installation unless --no-install is passed
if [ "$NO_INSTALL" -eq 0 ]; then
  echo "[5/5] Installing ${FLATPAK_ID} into user Flatpak installation..."
  flatpak --user install -y --reinstall "${FLATPAK_BUNDLE}"
else
  echo "[5/5] Skipping installation (--no-install specified)."
fi

echo "=== Flatpak build complete! ==="
echo "Bundle: ${FLATPAK_BUNDLE}"
echo "Run with: flatpak run ${FLATPAK_ID}"
