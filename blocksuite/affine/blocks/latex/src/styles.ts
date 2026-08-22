import { unsafeCSSVar, unsafeCSSVarV2 } from '@blocksuite/affine-shared/theme';
import { css } from 'lit';

export const latexBlockStyles = css`
  .latex-block-container {
    display: flex;
    position: relative;
    width: 100%;
    height: 100%;
    padding: 10px 24px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    overflow-x: auto;
    user-select: text;
  }

  .latex-block-container:hover {
    background: ${unsafeCSSVar('hoverColor')};
  }

  .latex-block-container:hover .latex-copy-button {
    opacity: 1;
  }

  .latex-copy-button {
    position: absolute;
    top: 6px;
    right: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 4px 6px;
    border-radius: 4px;
    border: 0.5px solid ${unsafeCSSVar('borderColor')};
    background: ${unsafeCSSVar('backgroundOverlayPanelColor')};
    color: ${unsafeCSSVar('textSecondaryColor')};
    font-family: Inter, sans-serif;
    font-size: 12px;
    font-weight: 500;
    line-height: 16px;
    cursor: pointer;
    user-select: none;
    opacity: 0;
    transition: opacity 0.15s ease-in-out, background 0.15s ease-in-out,
      color 0.15s ease-in-out, border-color 0.15s ease-in-out,
      transform 0.1s ease-in-out;
    z-index: 1;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .latex-copy-button:hover {
    background: ${unsafeCSSVar('hoverColor')};
    color: ${unsafeCSSVar('textPrimaryColor')};
  }

  .latex-copy-button:active {
    transform: scale(0.96);
  }

  .latex-copy-button.copied {
    opacity: 1;
    color: ${unsafeCSSVarV2('text/highlight/fg/green')};
    border-color: ${unsafeCSSVarV2('chip/label/green')};
  }

  .latex-copy-button svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
    flex-shrink: 0;
  }

  .latex-block-content {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .latex-block-error-placeholder {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 8px;
    border-radius: 4px;
    background: ${unsafeCSSVarV2('chip/label/red')};
    color: ${unsafeCSSVarV2('text/highlight/fg/red')};
    font-family: Inter, sans-serif;
    font-size: 12px;
    font-weight: 500;
    line-height: normal;
    user-select: none;
    cursor: help;
  }

  .latex-block-empty-placeholder {
    color: ${unsafeCSSVarV2('text/secondary')};
    font-family: Inter, sans-serif;
    font-size: 12px;
    font-weight: 500;
    line-height: normal;
    user-select: none;
  }
`;
