import { useEffect, useRef } from 'react';

import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
} from '@affine/core/modules/workbench';

// Electron webview element type (not in standard React DOM types)
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          allowpopups?: string;
          disablewebsecurity?: string;
          partition?: string;
          useragent?: string;
          preload?: string;
        },
        HTMLElement
      >;
    }
  }
}

export const Component = () => {
  const plankaUrl = 'http://localhost:7337';
  const webviewRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const wv = webviewRef.current as any;
    if (!wv) return;

    const handleFailLoad = (e: any) => {
      console.error('[Boards] webview load failed:', e);
    };

    wv.addEventListener('did-fail-load', handleFailLoad);
    return () => {
      wv.removeEventListener('did-fail-load', handleFailLoad);
    };
  }, []);

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
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Use Electron's <webview> tag — runs in its own process, bypasses CSP frame restrictions */}
          <webview
            ref={webviewRef as any}
            src={plankaUrl}
            allowpopups="true"
            style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      </ViewBody>
    </>
  );
};
