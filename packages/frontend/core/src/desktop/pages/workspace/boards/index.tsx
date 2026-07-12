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

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !desktopApi?.handler?.ui) return;

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

    // Send bounds on mount and on resize
    sendBounds();
    const resizeObserver = new ResizeObserver(sendBounds);
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      desktopApi.handler.ui.hidePlankaView().catch(console.error);
    };
  }, [desktopApi]);

  return (
    <>
      <ViewTitle title="Boards" />
      <ViewIcon icon="import" />
      <ViewHeader>
        <div
          style={{ padding: '0 16px', fontWeight: 'bold', fontSize: '14px' }}
        >
          AFFiNITe Boards
        </div>
      </ViewHeader>
      <ViewBody>
        {/* This div's bounds are sent to the main process to position the native Planka WebContentsView */}
        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        />
      </ViewBody>
    </>
  );
};
