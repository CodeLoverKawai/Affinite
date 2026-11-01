#!/bin/bash
set -e

# Directories
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$REPO_DIR/build"
APPDIR="$BUILD_DIR/AppDir"
RELEASE_BUNDLE="$BUILD_DIR/linux/x64/release/bundle"

echo "=== Preparing AppDir ==="
# Clean old AppDir
rm -rf "$APPDIR"
mkdir -p "$APPDIR"

# Copy Flutter release bundle
cp -r "$RELEASE_BUNDLE"/* "$APPDIR/"

# Copy Icon
cp "$REPO_DIR/assets/icon/Anx-logo.png" "$APPDIR/anx_remix.png"
cp "$REPO_DIR/assets/icon/Anx-logo.png" "$APPDIR/.DirIcon"

# Create .desktop file
cat << 'EOF' > "$APPDIR/anx_remix.desktop"
[Desktop Entry]
Name=Anx Remix
Comment=A clean, modern e-book reader.
Exec=anx_remix %U
Icon=anx_remix
Type=Application
Terminal=false
Categories=Office;Viewer;
MimeType=application/epub+zip;
EOF

# Create AppRun script
cat << 'EOF' > "$APPDIR/AppRun"
#!/bin/sh
SELF=$(dirname "$(readlink -f "$0")")
export LD_LIBRARY_PATH="$SELF/lib:$LD_LIBRARY_PATH"

# Disable WebKit sandbox inside AppImage to prevent DBus/bubblewrap permission failures on various distros
export WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1

# Set GDK backend to wayland if running under Wayland
if [ "$XDG_SESSION_TYPE" = "wayland" ] || [ -n "$WAYLAND_DISPLAY" ]; then
  export GDK_BACKEND=wayland
fi

# Force WPE WebKit to use AMD integrated graphics if available (card1) matching Hyprland's rendering device
# Also enable software rendering (LIBGL_ALWAYS_SOFTWARE=1) to prevent EGL composition issues on hybrid GPUs.
if [ -e "/dev/dri/card1" ]; then
  export WPE_DRM_DEVICE=/dev/dri/card1
  export LIBGL_ALWAYS_SOFTWARE=1
fi

# Disable DMABUF renderer in WebKit/WPE to prevent conflicts with hybrid GPUs / Wayland / NVIDIA drivers.
if [ -z "$WEBKIT_DISABLE_DMABUF_RENDERER" ]; then
  export WEBKIT_DISABLE_DMABUF_RENDERER=1
fi

exec "$SELF/anx_remix" "$@"
EOF
chmod +x "$APPDIR/AppRun"

echo "=== Downloading appimagetool ==="
APPIMAGE_TOOL="$BUILD_DIR/appimagetool-x86_64.AppImage"
if [ ! -f "$APPIMAGE_TOOL" ]; then
  curl -L -o "$APPIMAGE_TOOL" "https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage"
  chmod +x "$APPIMAGE_TOOL"
fi

echo "=== Generating AppImage ==="
export ARCH=x86_64
if ! "$APPIMAGE_TOOL" --appimage-extract-and-run "$APPDIR" "$REPO_DIR/Anx_Remix-x86_64.AppImage"; then
  echo "=== Main AppImage busy (running). Generating fallback: Anx_Remix_Test-x86_64.AppImage ==="
  "$APPIMAGE_TOOL" --appimage-extract-and-run "$APPDIR" "$REPO_DIR/Anx_Remix_Test-x86_64.AppImage"
  echo "=== AppImage successfully created at $REPO_DIR/Anx_Remix_Test-x86_64.AppImage ==="
else
  echo "=== AppImage successfully created at $REPO_DIR/Anx_Remix-x86_64.AppImage ==="
fi
