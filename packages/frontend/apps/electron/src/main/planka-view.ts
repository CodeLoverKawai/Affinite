import { WebContentsView } from 'electron';

import { logger } from './logger';
import { getMainWindow } from './windows-manager';

const PLANKA_URL = 'http://localhost:1337';

let plankaView: WebContentsView | null = null;

function getPlankaView(): WebContentsView {
  if (!plankaView) {
    plankaView = new WebContentsView({
      webPreferences: {
        sandbox: false, // required to load external http:// URLs
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    plankaView.webContents.loadURL(PLANKA_URL).catch(err => {
      logger.error('[planka-view] Failed to load Planka:', err);
    });
  }
  return plankaView;
}

export async function showPlankaView(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const mainWindow = await getMainWindow();
  if (!mainWindow) {
    logger.warn('[planka-view] No main window found, cannot show Planka view');
    return;
  }

  const view = getPlankaView();
  view.setBounds(bounds);

  const children = mainWindow.contentView.children;
  if (!children.includes(view)) {
    // Add BEFORE the last child (shell) so shell chrome stays on top
    mainWindow.contentView.addChildView(view);
  }

  logger.info('[planka-view] Planka view shown at', bounds);
}

export async function hidePlankaView() {
  const mainWindow = await getMainWindow();
  if (!mainWindow || !plankaView) return;

  try {
    mainWindow.contentView.removeChildView(plankaView);
    logger.info('[planka-view] Planka view hidden');
  } catch (err) {
    logger.error('[planka-view] Error hiding Planka view:', err);
  }
}

export function destroyPlankaView() {
  if (plankaView) {
    try {
      plankaView.webContents.close();
    } catch {}
    plankaView = null;
  }
}
