import type { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import type { DocMode } from '@blocksuite/affine/model';
import {
  CheckBoxCheckSolidIcon,
  DateTimeIcon,
  ImportIcon,
  PlusIcon,
} from '@blocksuite/icons/rc';

import type { usePageHelper } from '../blocksuite/block-suite-page-list/utils';
import type { GlobalDialogService } from '../modules/dialogs';
import type { WorkbenchService } from '../modules/workbench';
import { registerAffineCommand } from './registry';

export function registerAffineCreationCommands({
  pageHelper,
  t,
  globalDialogService,
  workbenchService,
}: {
  t: ReturnType<typeof useI18n>;
  pageHelper: ReturnType<typeof usePageHelper>;
  globalDialogService: GlobalDialogService;
  workbenchService?: WorkbenchService;
}) {
  const unsubs: Array<() => void> = [];
  unsubs.push(
    registerAffineCommand({
      id: 'affine:new-page',
      category: 'affine:creation',
      label: t['com.affine.cmdk.affine.new-page'](),
      icon: <PlusIcon />,
      keyBinding: BUILD_CONFIG.isElectron
        ? {
            binding: '$mod+N',
            skipRegister: true,
          }
        : undefined,
      run() {
        track.$.cmdk.creation.createDoc({ mode: 'page' });

        pageHelper.createPage('page' as DocMode);
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:new-edgeless-page',
      category: 'affine:creation',
      icon: <PlusIcon />,
      label: t['com.affine.cmdk.affine.new-edgeless-page'](),
      run() {
        track.$.cmdk.creation.createDoc({
          mode: 'edgeless',
        });

        pageHelper.createEdgeless();
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:new-workspace',
      category: 'affine:creation',
      icon: <PlusIcon />,
      label: t['com.affine.cmdk.affine.new-workspace'](),
      run() {
        track.$.cmdk.workspace.createWorkspace();

        globalDialogService.open('create-workspace', {});
      },
    })
  );
  unsubs.push(
    registerAffineCommand({
      id: 'affine:import-workspace',
      category: 'affine:creation',
      icon: <ImportIcon />,
      label: t['com.affine.cmdk.affine.import-workspace'](),
      preconditionStrategy: () => {
        return BUILD_CONFIG.isElectron;
      },
      run() {
        track.$.cmdk.workspace.createWorkspace({
          control: 'import',
        });

        globalDialogService.open('import-workspace', undefined);
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:quick-habit',
      category: 'affine:creation',
      icon: <CheckBoxCheckSolidIcon />,
      label: 'New Habit / Nuevo Hábito',
      run() {
        if (workbenchService) {
          workbenchService.workbench.open('/habits');
        } else if (typeof window !== 'undefined') {
          window.location.hash = '/habits';
        }
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:goto-calendar-today',
      category: 'affine:navigation',
      icon: <DateTimeIcon />,
      label: 'Calendar: Today / Calendario: Hoy',
      run() {
        if (workbenchService) {
          workbenchService.workbench.open('/calendar');
        } else if (typeof window !== 'undefined') {
          window.location.hash = '/calendar';
        }
      },
    })
  );

  return () => {
    unsubs.forEach(unsub => unsub());
  };
}
