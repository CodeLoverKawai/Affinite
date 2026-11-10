import { Button } from '@affine/component';
import { useNavigateHelper } from '@affine/core/components/hooks/use-navigate-helper';
import { ConfigureServerModal } from '@affine/core/desktop/dialogs/server-config';
import { getSelfhostBaseUrl } from '@affine/core/modules/cloud/constant';
import { GlobalDialogService } from '@affine/core/modules/dialogs';
import {
  type Workspace,
  type WorkspaceMetadata,
  WorkspacesService,
} from '@affine/core/modules/workspace';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useState } from 'react';

import * as styles from './server-rescue.css';

export interface ServerRescueScreenProps {
  workspace: Workspace;
  meta: WorkspaceMetadata;
  onRetry?: () => void;
}

export const ServerRescueScreen = ({
  meta,
  onRetry,
}: ServerRescueScreenProps) => {
  const workspacesService = useService(WorkspacesService);
  const globalDialogService = useService(GlobalDialogService);
  const workspaces = useLiveData(workspacesService.list.workspaces$);
  const { openPage } = useNavigateHelper();
  const [configModalOpen, setConfigModalOpen] = useState(false);

  const serverUrl = getSelfhostBaseUrl();

  const handleReturnToLocal = useCallback(() => {
    const localWorkspace = workspaces.find(w => w.flavour === 'local');
    if (localWorkspace) {
      if (typeof window !== 'undefined' && window.localStorage !== undefined) {
        window.localStorage.setItem('last_workspace_id', localWorkspace.id);
      }
      openPage(localWorkspace.id, 'all');
    } else {
      globalDialogService.open('create-workspace', { serverId: 'local' });
    }
  }, [globalDialogService, openPage, workspaces]);

  return (
    <div className={styles.rescueContainer}>
      <div className={styles.rescueCard}>
        <div className={styles.rescueIcon}>🔌</div>
        <h2 className={styles.rescueTitle}>
          No se pudo conectar al servidor
        </h2>
        <p className={styles.rescueDesc}>
          El espacio de trabajo <strong>&quot;{meta.name || 'Remoto'}&quot;</strong> no responde.
          El servidor Docker en la dirección configurada parece estar apagado o en otra máquina:
        </p>
        <div className={styles.rescueUrlBox}>{serverUrl}</div>
        <p className={styles.rescueDesc} style={{ fontSize: '13px' }}>
          Puedes regresar inmediatamente a tu espacio local offline o cambiar la dirección IP del servidor.
        </p>

        <div className={styles.rescueBtnRow}>
          <Button variant="primary" onClick={handleReturnToLocal}>
            🏠 Volver a mi Espacio Local
          </Button>
          <Button onClick={() => setConfigModalOpen(true)}>
            ⚙️ Configurar URL del Servidor
          </Button>
          {onRetry && (
            <Button variant="plain" onClick={onRetry}>
              🔄 Reintentar
            </Button>
          )}
        </div>
      </div>

      <ConfigureServerModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        onSaved={() => {
          onRetry?.();
        }}
      />
    </div>
  );
};
