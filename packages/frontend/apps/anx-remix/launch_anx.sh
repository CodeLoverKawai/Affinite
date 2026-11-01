#!/usr/bin/env bash
# Wrapper to launch ANX Reader with correct DRM device for hybrid GPU setup

# Disable WebKit sandbox inside container wrapper to prevent permission failures
export WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1

# Set GDK backend to wayland if running under Wayland
if [ "$XDG_SESSION_TYPE" = "wayland" ] || [ -n "$WAYLAND_DISPLAY" ]; then
  export GDK_BACKEND=wayland
fi

# Force WPE WebKit to use the AMD integrated graphics (card1) matching Hyprland's rendering device
if [ -e "/dev/dri/card1" ]; then
  export WPE_DRM_DEVICE=/dev/dri/card1
fi

# Disable DMABUF renderer in WebKit/WPE only for X11 sessions with NVIDIA drivers,
# and explicitly enable it (0) on Wayland to match the working command parameters.
if [ -z "$WEBKIT_DISABLE_DMABUF_RENDERER" ]; then
  if [ "$XDG_SESSION_TYPE" = "wayland" ] || [ -n "$WAYLAND_DISPLAY" ]; then
    export WEBKIT_DISABLE_DMABUF_RENDERER=0
  else
    if grep -q "nvidia" /proc/modules 2>/dev/null; then
      export WEBKIT_DISABLE_DMABUF_RENDERER=1
    fi
  fi
fi

# Execute the compiled native binary directly
exec /home/rousseau/anx-reader/build/linux/x64/release/bundle/anx_reader "$@"
