export function linkIframe(iframe: HTMLIFrameElement, html: string) {
  iframe.srcdoc = html;
  iframe.sandbox.add(
    'allow-pointer-lock',
    'allow-popups',
    'allow-forms',
    'allow-popups-to-escape-sandbox',
    'allow-downloads',
    'allow-scripts'
  );
}
