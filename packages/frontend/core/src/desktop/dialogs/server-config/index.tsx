import { Button, Input, Modal, notify } from '@affine/component';
import {
  getSelfhostBaseUrl,
  isSelfhostDisabled,
  setSelfhostBaseUrl,
  setSelfhostDisabled,
} from '@affine/core/modules/cloud/constant';
import { useCallback, useState } from 'react';

export interface ConfigureServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (newUrl: string) => void;
}

export const ConfigureServerModal = ({
  open,
  onOpenChange,
  onSaved,
}: ConfigureServerModalProps) => {
  const [url, setUrl] = useState(() => getSelfhostBaseUrl());
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Por favor ingresa una URL válida.');
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      setError('La URL debe comenzar con http:// o https:// (ej. http://192.168.1.50:5320)');
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      setError('Formato de URL inválido.');
      return;
    }

    setSelfhostDisabled(false);
    setSelfhostBaseUrl(trimmed);
    notify.success({
      title: 'Servidor Configurado',
      message: `Nueva dirección del servidor: ${trimmed}`,
    });
    onSaved?.(trimmed);
    onOpenChange(false);
  }, [onOpenChange, onSaved, url]);

  const handleReset = useCallback(() => {
    const defaultUrl = 'http://localhost:5320';
    setUrl(defaultUrl);
    setSelfhostDisabled(false);
    setSelfhostBaseUrl(defaultUrl);
    notify.info({
      title: 'Restablecido',
      message: 'Dirección de servidor restablecida a http://localhost:5320',
    });
    onSaved?.(defaultUrl);
    onOpenChange(false);
  }, [onOpenChange, onSaved]);

  const handleDisable = useCallback(() => {
    setSelfhostDisabled(true);
    notify.info({
      title: 'Servidor Desconectado',
      message: 'El servidor remoto ha sido ocultado de la lista.',
    });
    onSaved?.('');
    onOpenChange(false);
  }, [onOpenChange, onSaved]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      width={480}
      contentOptions={{ style: { padding: '24px' } }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 6px 0' }}>
            ⚙️ Configurar Servidor Selfhost (Docker)
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--affine-text-secondary-color)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Si tienes AFFiNITe Docker corriendo en otra computadora o en un servidor local,
            escribe aquí su dirección IP o dominio con el puerto (por ejemplo:{' '}
            <code style={{ fontSize: '12px' }}>http://192.168.1.50:5320</code>).
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>URL del Servidor</label>
          <Input
            value={url}
            onChange={val => {
              setUrl(val);
              setError(null);
            }}
            placeholder="http://192.168.1.50:5320"
            autoFocus
          />
          {error && (
            <span style={{ fontSize: '12px', color: 'var(--affine-error-color)' }}>
              {error}
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="plain" onClick={handleReset} style={{ fontSize: '12px' }}>
              Restablecer localhost
            </Button>
            {!isSelfhostDisabled() && (
              <Button
                variant="plain"
                onClick={handleDisable}
                style={{ fontSize: '12px', color: 'var(--affine-error-color)' }}
              >
                Ocultar Servidor
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
