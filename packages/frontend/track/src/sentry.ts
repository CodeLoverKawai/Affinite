

function createSentry() {
  const wrapped = {
    init() {
      // Disabled for AFFiNITe standalone privacy
    },
    enable() {
      // Disabled for AFFiNITe standalone privacy
    },
    disable() {
      // Disabled for AFFiNITe standalone privacy
    },
  };

  return wrapped;
}

export const sentry = createSentry();
