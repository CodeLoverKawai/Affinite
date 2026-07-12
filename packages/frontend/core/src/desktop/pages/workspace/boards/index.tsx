import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
} from '@affine/core/modules/workbench';

export const Component = () => {
  // Point to local Planka service port
  const plankaUrl = "http://localhost:7337";

  return (
    <>
      <ViewTitle title="Boards" />
      <ViewIcon icon="import" />
      <ViewHeader>
        <div style={{ padding: '0 16px', fontWeight: 'bold', fontSize: '14px' }}>
          AFFiNITe Boards
        </div>
      </ViewHeader>
      <ViewBody>
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
          <iframe
            src={plankaUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Planka Project Board"
            allow="storage-access; fullscreen; clipboard-read; clipboard-write"
          />
        </div>
      </ViewBody>
    </>
  );
};
