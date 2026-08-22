import { selectBlock } from '@blocksuite/affine-block-note';
import { CaptionedBlockComponent } from '@blocksuite/affine-components/caption';
import { createLitPortal } from '@blocksuite/affine-components/portal';
import type { LatexBlockModel } from '@blocksuite/affine-model';
import { CopyIcon, DoneIcon } from '@blocksuite/icons/lit';
import { BlockSelection } from '@blocksuite/std';
import type { Placement } from '@floating-ui/dom';
import { effect } from '@preact/signals-core';
import { html, nothing, render } from 'lit';
import { query, state } from 'lit/decorators.js';

import { safeRenderKatex } from './katex-config.js';
import { latexBlockStyles } from './styles.js';

export class LatexBlockComponent extends CaptionedBlockComponent<LatexBlockModel> {
  static override styles = latexBlockStyles;

  private _editorAbortController: AbortController | null = null;

  @state()
  private accessor _copied = false;

  get editorPlacement(): Placement {
    return 'bottom';
  }

  get isBlockSelected() {
    const blockSelection = this.selection.filter(BlockSelection);
    return blockSelection.some(
      selection => selection.blockId === this.model.id
    );
  }

  override firstUpdated(props: Map<string, unknown>) {
    super.firstUpdated(props);

    const { disposables } = this;

    this._editorAbortController?.abort();
    this._editorAbortController = new AbortController();
    disposables.add(() => {
      this._editorAbortController?.abort();
    });

    const katexContainer = this._katexContainer;
    if (!katexContainer) return;

    disposables.add(
      effect(() => {
        const latex = this.model.props.latex$.value;
        this.requestUpdate();

        katexContainer.replaceChildren();
        // @ts-expect-error lit hack won't fix
        delete katexContainer['_$litPart$'];

        if (latex.length === 0) {
          render(
            html`<span class="latex-block-empty-placeholder">Equation</span>`,
            katexContainer
          );
        } else {
          const result = safeRenderKatex(latex, katexContainer, {
            displayMode: true,
          });
          if (!result.success) {
            katexContainer.replaceChildren();
            // @ts-expect-error lit hack won't fix
            delete katexContainer['_$litPart$'];
            render(
              html`<span
                class="latex-block-error-placeholder"
                title=${result.error ?? 'LaTeX error'}
                >Error equation</span
              >`,
              katexContainer
            );
          }
        }
      })
    );
  }

  private _handleClick() {
    if (this.store.readonly) return;

    if (this.isBlockSelected) {
      this.toggleEditor();
    } else {
      this.selectBlock();
    }
  }

  private _handleCopy = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (this._copied) return;

    const latex = this.model.props.latex$.value;
    if (this.std?.clipboard) {
      this.std.clipboard
        .writeToClipboard(items => ({
          ...items,
          'text/plain': latex,
        }))
        .then(() => {
          this._copied = true;
          setTimeout(() => {
            this._copied = false;
          }, 1500);
        })
        .catch(err => {
          console.error('Failed to copy LaTeX via std.clipboard:', err);
          if (navigator?.clipboard) {
            navigator.clipboard
              .writeText(latex)
              .then(() => {
                this._copied = true;
                setTimeout(() => {
                  this._copied = false;
                }, 1500);
              })
              .catch(console.error);
          }
        });
    } else if (navigator?.clipboard) {
      navigator.clipboard
        .writeText(latex)
        .then(() => {
          this._copied = true;
          setTimeout(() => {
            this._copied = false;
          }, 1500);
        })
        .catch(console.error);
    }
  };

  removeEditor(portal: HTMLDivElement) {
    portal.remove();
  }

  override renderBlock() {
    const latex = this.model.props.latex$.value;
    const showCopyButton = latex.length > 0 && !this.store.readonly;

    return html`
      <div
        contenteditable="false"
        class="latex-block-container"
        @click=${this._handleClick}
      >
        <div class="latex-block-content"></div>
        ${showCopyButton
          ? html`<button
              type="button"
              class="latex-copy-button ${this._copied ? 'copied' : ''}"
              @click=${this._handleCopy}
              title="${this._copied ? 'Copied!' : 'Copy LaTeX'}"
            >
              ${this._copied ? DoneIcon() : CopyIcon()}
              ${this._copied ? html`<span>Copied!</span>` : nothing}
            </button>`
          : nothing}
      </div>
    `;
  }

  selectBlock() {
    this.host.command.exec(selectBlock, {
      focusBlock: this,
    });
  }

  toggleEditor() {
    const katexContainer = this._katexContainer;
    if (!katexContainer) return;

    this._editorAbortController?.abort();
    this._editorAbortController = new AbortController();

    this.selection.setGroup('note', []);

    const { portal } = createLitPortal({
      template: html`<latex-editor-menu
        .std=${this.std}
        .latexSignal=${this.model.props.latex$}
        .abortController=${this._editorAbortController}
      ></latex-editor-menu>`,
      container: this.host,
      computePosition: {
        referenceElement: this,
        placement: this.editorPlacement,
        autoUpdate: {
          animationFrame: true,
        },
      },
      closeOnClickAway: true,
      abortController: this._editorAbortController,
      shadowDom: false,
      portalStyles: {
        zIndex: 'var(--affine-z-index-popover)',
      },
    });

    this._editorAbortController.signal.addEventListener(
      'abort',
      () => {
        this.removeEditor(portal);
      },
      { once: true }
    );
  }

  @query('.latex-block-content')
  private accessor _katexContainer!: HTMLDivElement;
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-latex': LatexBlockComponent;
  }
}

