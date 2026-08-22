import { safeRenderKatex } from '@blocksuite/affine-block-latex';
import { ColorScheme } from '@blocksuite/affine-model';
import type { RichText } from '@blocksuite/affine-rich-text';
import { ThemeProvider } from '@blocksuite/affine-shared/services';
import { unsafeCSSVar, unsafeCSSVarV2 } from '@blocksuite/affine-shared/theme';
import type { AffineTextAttributes } from '@blocksuite/affine-shared/types';
import { SignalWatcher, WithDisposable } from '@blocksuite/global/lit';
import { noop } from '@blocksuite/global/utils';
import { DoneIcon } from '@blocksuite/icons/lit';
import { type BlockStdScope, ShadowlessElement } from '@blocksuite/std';
import { InlineManagerExtension } from '@blocksuite/std/inline';
import { effect, type Signal, signal } from '@preact/signals-core';
import { css, html, nothing, render } from 'lit';
import { property, query } from 'lit/decorators.js';
import { codeToTokensBase, type ThemedToken } from 'shiki';
import * as Y from 'yjs';

import { LatexEditorUnitSpecExtension } from '../inline-spec';

export interface LatexSnippetItem {
  label: string;
  snippet: string;
}

export const LATEX_SNIPPETS: LatexSnippetItem[] = [
  { label: 'a/b', snippet: '\\frac{a}{b}' },
  { label: '√x', snippet: '\\sqrt{x}' },
  { label: '∑', snippet: '\\sum_{i=1}^{n}' },
  { label: '∫', snippet: '\\int_{a}^{b}' },
  {
    label: '[Matrix]',
    snippet: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
  },
  {
    label: '{Cases',
    snippet:
      '\\begin{cases} a & \\text{si } x>0 \\\\ b & \\text{si } x\\le 0 \\end{cases}',
  },
  {
    label: 'Aligned',
    snippet: '\\begin{aligned} a &= b \\\\ c &= d \\end{aligned}',
  },
];

export const LatexEditorInlineManagerExtension =
  InlineManagerExtension<AffineTextAttributes>({
    id: 'latex-inline-editor',
    enableMarkdown: false,
    specs: [LatexEditorUnitSpecExtension.identifier],
  });

export class LatexEditorMenu extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  static override styles = css`
    .latex-editor-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 520px;
      max-width: 820px;
      width: 100%;
      box-sizing: border-box;

      padding: 10px 12px;
      border-radius: 8px;
      border: 0.5px solid ${unsafeCSSVar('borderColor')};
      background: ${unsafeCSSVar('backgroundOverlayPanelColor')};

      /* light/toolbarShadow */
      box-shadow: 0px 6px 16px 0px rgba(0, 0, 0, 0.14);
    }

    .latex-snippets-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      padding-bottom: 6px;
      border-bottom: 0.5px solid ${unsafeCSSVar('borderColor')};
      overflow-x: auto;
    }

    .latex-snippet-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 3px 8px;
      border-radius: 4px;
      border: 0.5px solid ${unsafeCSSVar('borderColor')};
      background: ${unsafeCSSVar('white10')};
      color: ${unsafeCSSVar('textPrimaryColor')};
      font-family: ${unsafeCSSVar('fontCodeFamily')};
      font-size: 12px;
      font-weight: 500;
      line-height: 16px;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      transition: all 0.15s ease-in-out;
    }

    .latex-snippet-btn:hover {
      background: ${unsafeCSSVar('hoverColor')};
      border-color: ${unsafeCSSVar('blue700')};
      color: ${unsafeCSSVar('primaryColor')};
    }

    .latex-snippet-btn:active {
      transform: scale(0.97);
    }

    .latex-editor-panes {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
      gap: 8px;
      align-items: stretch;
    }

    .latex-editor {
      padding: 6px 10px;
      border-radius: 4px;
      background: ${unsafeCSSVar('white10')};

      /* light/activeShadow */
      box-shadow: 0px 0px 0px 2px rgba(30, 150, 235, 0.3);

      font-family: ${unsafeCSSVar('fontCodeFamily')};
      border: 1px solid transparent;

      min-height: 56px;
      max-height: 300px;
      overflow-y: auto;
      box-sizing: border-box;
    }

    .latex-editor:focus-within {
      border: 1px solid ${unsafeCSSVar('blue700')};
    }

    .latex-editor-confirm {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-left: 2px;
    }

    .latex-editor-confirm span {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 4px;
      cursor: pointer;
      color: ${unsafeCSSVar('textSecondaryColor')};
      transition: background 0.15s ease, color 0.15s ease;
    }

    .latex-editor-confirm span:hover {
      background: ${unsafeCSSVar('hoverColor')};
      color: ${unsafeCSSVar('primaryColor')};
    }

    .latex-live-preview-box {
      min-height: 56px;
      max-height: 300px;
      padding: 6px 10px;
      border-radius: 4px;
      border: 0.5px solid ${unsafeCSSVar('borderColor')};
      background: ${unsafeCSSVar('white10')};
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
      box-sizing: border-box;
    }

    .latex-preview-placeholder {
      color: ${unsafeCSSVar('placeholderColor')};
      font-size: 12px;
      font-style: italic;
      text-align: center;
      user-select: none;
    }

    .latex-preview-placeholder.invalid {
      opacity: 0.7;
    }

    .latex-error-status {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 4px;
      background: ${unsafeCSSVarV2('chip/label/red')};
      color: ${unsafeCSSVarV2('text/highlight/fg/red')};
      font-family: ${unsafeCSSVar('fontCodeFamily')};
      font-size: 11px;
      line-height: 15px;
      word-break: break-word;
    }

    .latex-error-icon {
      font-size: 12px;
      flex-shrink: 0;
    }

    .latex-error-text {
      flex: 1;
    }

    .latex-editor-hint {
      color: ${unsafeCSSVar('placeholderColor')};

      /* MobileTypeface/caption */
      font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-style: normal;
      font-weight: 400;
      line-height: 16px; /* 133.333% */
      letter-spacing: -0.24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  `;

  highlightTokens$: Signal<ThemedToken[][]> = signal([]);

  error$: Signal<string | null> = signal(null);

  yText!: Y.Text;

  @query('.latex-live-preview-box')
  private accessor _previewContainer!: HTMLElement | null;

  get inlineManager() {
    return this.std.get(LatexEditorInlineManagerExtension.identifier);
  }

  get richText() {
    return this.querySelector<RichText>('rich-text');
  }

  private readonly _getVerticalScrollContainer = () => {
    return this.querySelector('.latex-editor');
  };

  private _updateHighlightTokens(text: string) {
    const editorTheme = this.std.get(ThemeProvider).theme;
    const theme = editorTheme === ColorScheme.Dark ? 'dark-plus' : 'light-plus';

    codeToTokensBase(text, {
      lang: 'latex',
      theme,
    })
      .then(token => {
        this.highlightTokens$.value = token;
      })
      .catch(console.error);
  }

  private _updateLivePreview(text: string) {
    const previewEl = this._previewContainer;
    if (!previewEl) return;

    const trimmed = text.trim();

    previewEl.replaceChildren();
    // @ts-expect-error lit hack won't fix
    delete previewEl['_$litPart$'];

    if (trimmed.length === 0) {
      this.error$.value = null;
      render(
        html`<span class="latex-preview-placeholder"
          >Vista previa de ecuación / Equation preview</span
        >`,
        previewEl
      );
      return;
    }

    const result = safeRenderKatex(trimmed, previewEl, {
      displayMode: true,
    });

    if (result.success) {
      this.error$.value = null;
    } else {
      this.error$.value = result.error ?? 'LaTeX syntax error';
      previewEl.replaceChildren();
      // @ts-expect-error lit hack won't fix
      delete previewEl['_$litPart$'];
      render(
        html`<span class="latex-preview-placeholder invalid"
          >Vista previa de ecuación / Equation preview</span
        >`,
        previewEl
      );
    }
  }

  insertSnippet(snippet: string) {
    if (!this.yText) return;

    const inlineEditor = this.richText?.inlineEditor;
    const inlineRange = inlineEditor?.getInlineRange();

    let index = this.yText.length;
    let length = 0;

    if (inlineRange && typeof inlineRange.index === 'number') {
      index = Math.min(Math.max(0, inlineRange.index), this.yText.length);
      length = Math.min(
        Math.max(0, inlineRange.length),
        this.yText.length - index
      );
    }

    if (length > 0) {
      this.yText.delete(index, length);
    }
    this.yText.insert(index, snippet);

    const newIndex = index + snippet.length;

    if (inlineEditor) {
      inlineEditor.setInlineRange({ index: newIndex, length: 0 });
      inlineEditor.focusIndex(newIndex);
    }

    const text = this.yText.toString();
    this.latexSignal.value = text;
    this._updateHighlightTokens(text);
    this._updateLivePreview(text);
  }

  override connectedCallback(): void {
    super.connectedCallback();

    const doc = new Y.Doc();
    this.yText = doc.getText('latex');
    this.yText.insert(0, this.latexSignal.value);

    const yTextObserver = () => {
      const text = this.yText.toString();
      this.latexSignal.value = text;

      this._updateHighlightTokens(text);
      this._updateLivePreview(text);
    };
    this.yText.observe(yTextObserver);
    this.disposables.add(() => {
      this.yText.unobserve(yTextObserver);
    });

    this.disposables.add(
      effect(() => {
        noop(this.highlightTokens$.value);
        this.richText?.inlineEditor?.render();
      })
    );

    this.disposables.add(
      this.std.get(ThemeProvider).theme$.subscribe(() => {
        const text = this.yText.toString();
        this._updateHighlightTokens(text);
        this._updateLivePreview(text);
      })
    );

    this.disposables.addFromEvent(this, 'keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        this.abortController.abort();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.abortController.abort();
      }
    });

    this.disposables.addFromEvent(this, 'pointerdown', e => {
      e.stopPropagation();
    });
    this.disposables.addFromEvent(this, 'pointerup', e => {
      e.stopPropagation();
    });

    this.updateComplete
      .then(async () => {
        await this.richText?.updateComplete;

        this._updateLivePreview(this.yText.toString());

        setTimeout(() => {
          this.richText?.inlineEditor?.focusEnd();
        });
      })
      .catch(console.error);
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (
      this._previewContainer &&
      this._previewContainer.children.length === 0
    ) {
      this._updateLivePreview(this.yText?.toString() ?? '');
    }
  }

  override render() {
    return html`<div class="latex-editor-container">
      <div class="latex-snippets-bar">
        ${LATEX_SNIPPETS.map(
          item => html`
            <button
              type="button"
              class="latex-snippet-btn"
              title=${item.snippet}
              @pointerdown=${(e: PointerEvent) => {
                e.preventDefault();
              }}
              @click=${(e: MouseEvent) => {
                e.preventDefault();
                this.insertSnippet(item.snippet);
              }}
            >
              ${item.label}
            </button>
          `
        )}
      </div>

      <div class="latex-editor-panes">
        <div class="latex-editor">
          <div class="latex-editor-content">
            <rich-text
              .yText=${this.yText}
              .attributesSchema=${this.inlineManager.getSchema()}
              .attributeRenderer=${this.inlineManager.getRenderer()}
              .verticalScrollContainerGetter=${this._getVerticalScrollContainer}
            ></rich-text>
          </div>
        </div>

        <div class="latex-live-preview-box"></div>

        <div class="latex-editor-confirm">
          <span
            @click=${() => this.abortController.abort()}
            title="Confirm (Enter)"
            >${DoneIcon({
              width: '24',
              height: '24',
            })}</span
          >
        </div>
      </div>

      ${this.error$.value
        ? html`<div class="latex-error-status">
            <span class="latex-error-icon">⚠️</span>
            <span class="latex-error-text">${this.error$.value}</span>
          </div>`
        : nothing}

      <div class="latex-editor-hint">
        <span>Shift Enter to line break</span>
        <span>Enter to confirm • Esc to cancel</span>
      </div>
    </div>`;
  }

  @property({ attribute: false })
  accessor abortController!: AbortController;

  @property({ attribute: false })
  accessor latexSignal!: Signal<string>;

  @property({ attribute: false })
  accessor std!: BlockStdScope;
}

