import { NavigationPanelTreeRoot } from '@affine/core/desktop/components/navigation-panel';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { ViewLayersIcon } from '@blocksuite/icons/rc';
import { useServices } from '@toeverything/infra';
import { useCallback, useMemo } from 'react';

import { AddItemPlaceholder } from '../../layouts/add-item-placeholder';
import { CollapsibleSection } from '../../layouts/collapsible-section';

export const NavigationPanelBoards = () => {
  const { workbenchService } = useServices({
    WorkbenchService,
  });
  const path = useMemo(() => ['boards'], []);

  const handleOpenBoards = useCallback(() => {
    workbenchService.workbench.open('/boards');
  }, [workbenchService.workbench]);

  return (
    <CollapsibleSection
      path={path}
      testId="navigation-panel-boards"
      title="Boards"
    >
      <NavigationPanelTreeRoot>
        <AddItemPlaceholder
          icon={<ViewLayersIcon />}
          data-testid="navigation-panel-bar-boards-button"
          label="Boards"
          onClick={handleOpenBoards}
        />
      </NavigationPanelTreeRoot>
    </CollapsibleSection>
  );
};
