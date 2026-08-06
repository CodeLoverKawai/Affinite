import { sentry, tracker } from '@affine/track';

// Permanently disable sentry and telemetry tracking for AFFiNITe
sentry.disable();
tracker.opt_out_tracking();

