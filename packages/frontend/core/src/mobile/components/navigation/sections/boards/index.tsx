import { NavigationPanelTreeRoot } from '@affine/core/desktop/components/navigation-panel';
import { WorkbenchService } from '@affine/core/modules/workbench';
import {
  CheckBoxCheckSolidIcon,
  DateTimeIcon,
  FirePanelIcon,
  PresentationIcon,
  ViewLayersIcon,
} from '@blocksuite/icons/rc';
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

  const handleOpenCalendar = useCallback(() => {
    workbenchService.workbench.open('/calendar');
  }, [workbenchService.workbench]);

  const handleOpenHabits = useCallback(() => {
    workbenchService.workbench.open('/habits');
  }, [workbenchService.workbench]);

  const handleOpenStreaks = useCallback(() => {
    workbenchService.workbench.open('/streaks');
  }, [workbenchService.workbench]);

  const handleOpenWeeklyReports = useCallback(() => {
    workbenchService.workbench.open('/weekly-reports');
  }, [workbenchService.workbench]);

  return (
    <CollapsibleSection
      path={path}
      testId="navigation-panel-boards"
      title="Tableros"
    >
      <NavigationPanelTreeRoot>
        <AddItemPlaceholder
          icon={<ViewLayersIcon />}
          data-testid="navigation-panel-bar-boards-button"
          label="Tableros"
          onClick={handleOpenBoards}
        />
        <AddItemPlaceholder
          icon={<DateTimeIcon />}
          data-testid="navigation-panel-bar-calendar-button"
          label="Calendario"
          onClick={handleOpenCalendar}
        />
        <AddItemPlaceholder
          icon={<CheckBoxCheckSolidIcon />}
          data-testid="navigation-panel-bar-habits-button"
          label="Hábitos"
          onClick={handleOpenHabits}
        />
        <AddItemPlaceholder
          icon={<FirePanelIcon />}
          data-testid="navigation-panel-bar-streaks-button"
          label="Streaks"
          onClick={handleOpenStreaks}
        />
        <AddItemPlaceholder
          icon={<PresentationIcon />}
          data-testid="navigation-panel-bar-weekly-reports-button"
          label="Reportes Semanales"
          onClick={handleOpenWeeklyReports}
        />
      </NavigationPanelTreeRoot>
    </CollapsibleSection>
  );
};
