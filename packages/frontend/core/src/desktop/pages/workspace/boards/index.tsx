import { useEffect, useRef } from 'react';

import { DesktopApiService } from '@affine/core/modules/desktop-api';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
} from '@affine/core/modules/workbench';
import { useServiceOptional } from '@toeverything/infra';

export const Component = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const desktopApi = useServiceOptional(DesktopApiService);

  const isElectron = !!desktopApi;

  // Resolve the Planka URL dynamically. On desktop we load localhost:1337.
  // On web client, we load the same domain but on port 1337 (where Planka container is exposed).
  const plankaUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:1337`
    : 'http://localhost:1337';

  useEffect(() => {
    // If not in Electron, do not try to load WebContentsView
    if (!isElectron || !containerRef.current || !desktopApi?.handler?.ui) return;

    const el = containerRef.current;

    const sendBounds = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      desktopApi.handler.ui
        .showPlankaView({
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        })
        .catch(console.error);
    };

    // Send bounds on mount and resize
    sendBounds();
    const resizeObserver = new ResizeObserver(sendBounds);
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      desktopApi.handler.ui.hidePlankaView().catch(console.error);
    };
  }, [desktopApi, isElectron]);

  return (
    <>
      <ViewTitle title="Boards" />
      <ViewIcon icon="import" />
      <ViewHeader>
        <div
          style={{ padding: '0 16px', fontWeight: 'bold', fontSize: '14px', color: 'var(--affine-text-primary-color)' }}
        >
          AFFiNITe Boards
        </div>
      </ViewHeader>
      <ViewBody>
        {isElectron ? (
          /* On Desktop, this div's bounds are sent to the main process to position the native Planka WebContentsView */
          <div
            ref={containerRef}
            style={{ width: '100%', height: '100%', background: 'transparent' }}
          />
        ) : (
          /* On Web Client, we fallback to a clean borderless iframe pointing to the server's Planka instance */
          <iframe
            src={plankaUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: 'var(--affine-background-primary-color, #ffffff)',
            }}
            title="Planka Board"
            allow="clipboard-read; clipboard-write"
          />
        )}
      </ViewBody>
    </>
  );
};
