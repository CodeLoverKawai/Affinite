import { CodeBlockPreviewExtension } from '@blocksuite/affine/blocks/code';
import { SignalWatcher, WithDisposable } from '@blocksuite/affine/global/lit';
import type { CodeBlockModel } from '@blocksuite/affine/model';
import { unsafeCSSVarV2 } from '@blocksuite/affine/shared/theme';
import { ShadowlessElement } from '@blocksuite/std';
import { css, html, nothing, type PropertyValues } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { Mermaid } from 'mermaid';

export interface MermaidTemplatePreset {
  id: string;
  label: string;
  code: string;
}

export const MERMAID_TEMPLATES: MermaidTemplatePreset[] = [
  {
    id: 'flowchart',
    label: 'Flujo (Flowchart)',
    code: [
      'flowchart TD',
      '  A["Inicio"] --> B{"¿Datos válidos?"}',
      '  B -- "Sí" --> C["Procesar solicitud"]',
      '  B -- "No" --> D["Mostrar error"]',
      '  C --> E["Guardar en BD"]',
      '  E --> F["Fin"]',
    ].join('\n'),
  },
  {
    id: 'sequence',
    label: 'Secuencia (Sequence)',
    code: [
      'sequenceDiagram',
      '  autonumber',
      '  actor U as Usuario',
      '  participant A as App (Frontend)',
      '  participant S as Servidor API',
      '  U->>A: Envía formulario',
      '  A->>S: POST /api/items',
      '  S-->>A: 201 Created (JSON)',
      '  A-->>U: Confirmación visual',
    ].join('\n'),
  },
  {
    id: 'class',
    label: 'Clases UML (Class)',
    code: [
      'classDiagram',
      '  class Usuario {',
      '    +String id',
      '    +String nombre',
      '    +String email',
      '    +autenticar() bool',
      '  }',
      '  class Proyecto {',
      '    +String id',
      '    +String titulo',
      '    +Date creadoEn',
      '    +agregarTarea()',
      '  }',
      '  Usuario "1" --> "*" Proyecto : gestiona',
    ].join('\n'),
  },
  {
    id: 'state',
    label: 'Estados (State)',
    code: [
      'stateDiagram-v2',
      '  [*] --> Pendiente',
      '  Pendiente --> EnProgreso : iniciar()',
      '  EnProgreso --> EnRevision : enviarPR()',
      '  EnRevision --> EnProgreso : solicitarCambios()',
      '  EnRevision --> Completado : aprobar()',
      '  Completado --> [*]',
    ].join('\n'),
  },
  {
    id: 'er',
    label: 'Entidad-Relación (ER)',
    code: [
      'erDiagram',
      '  USUARIO ||--o{ NOTA : escribe',
      '  PROYECTO ||--o{ TAREA : contiene',
      '  USUARIO {',
      '    string id PK',
      '    string nombre',
      '    string email',
      '  }',
      '  NOTA {',
      '    string id PK',
      '    string titulo',
      '    date fecha',
      '  }',
    ].join('\n'),
  },
  {
    id: 'mindmap',
    label: 'Mapa Mental (Mindmap)',
    code: [
      'mindmap',
      '  root(("Proyecto AFFiNITe"))',
      '    Arquitectura',
      '      Offline-First',
      '      Yjs CRDT',
      '      SQLite Local',
      '    Productividad',
      '      Notas Semanales',
      '      Calendario',
      '      Tableros Kanban',
      '    IA Integrada',
      '      Antigravity CLI',
      '      Ollama Local',
    ].join('\n'),
  },
];

/**
 * Strips accidental outer ```mermaid ... ``` markdown fences and normalizes line endings.
 */
export function normalizeMermaidCode(raw: string | null | undefined): string {
  if (!raw) return '';
  let cleaned = raw.replace(/\r\n/g, '\n').trim();
  const fenceMatch = cleaned.match(/^```(?:mermaid)?\s*\n([\s\S]*?)\n?```$/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  return cleaned;
}

/**
 * Computes zoom scale and translation around a mouse cursor point without mutating state prematurely.
 */
export function computeWheelZoom(params: {
  scale: number;
  translateX: number;
  translateY: number;
  deltaY: number;
  mouseX: number;
  mouseY: number;
}): { scale: number; translateX: number; translateY: number } {
  const prevScale = params.scale || 1;
  const delta = params.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(0.1, Math.min(5, prevScale * delta));
  const scaleCenterX = params.mouseX - params.translateX;
  const scaleCenterY = params.mouseY - params.translateY;
  const translateX = params.mouseX - scaleCenterX * (newScale / prevScale);
  const translateY = params.mouseY - scaleCenterY * (newScale / prevScale);

  return {
    scale: newScale,
    translateX,
    translateY,
  };
}

export const CodeBlockMermaidPreview = CodeBlockPreviewExtension(
  'mermaid',
  model => html`<mermaid-preview .model=${model}></mermaid-preview>`
);

export class MermaidPreview extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  static override styles = css`
    .mermaid-preview-wrapper {
      width: 100%;
      border: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
      border-radius: 10px;
      background: ${unsafeCSSVarV2('layer/background/primary')};
      overflow: hidden;
      font-family: Inter, system-ui, -apple-system, sans-serif;
    }

    .mermaid-preview-wrapper.fullscreen {
      position: fixed;
      inset: 16px;
      width: auto;
      height: calc(100vh - 32px);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
    }

    .mermaid-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
      background: ${unsafeCSSVarV2('layer/background/secondary')};
      user-select: none;
    }

    .mermaid-header-left,
    .mermaid-header-right {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }

    .mermaid-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(99, 102, 241, 0.14);
      color: #6366f1;
    }

    .mermaid-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 500;
    }

    .mermaid-status-pill.ok {
      background: rgba(16, 185, 129, 0.14);
      color: #10b981;
    }

    .mermaid-status-pill.err {
      background: rgba(239, 68, 68, 0.14);
      color: #ef4444;
    }

    .mermaid-toolbar-btn {
      height: 26px;
      padding: 0 9px;
      border-radius: 6px;
      border: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
      background: ${unsafeCSSVarV2('layer/background/primary')};
      color: ${unsafeCSSVarV2('text/primary')};
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
    }

    .mermaid-toolbar-btn:hover {
      background: ${unsafeCSSVarV2('layer/background/hoverOverlay')};
    }

    .mermaid-toolbar-btn.active {
      background: #6366f1;
      border-color: #6366f1;
      color: #ffffff;
    }

    .mermaid-template-select {
      height: 26px;
      padding: 0 8px;
      border-radius: 6px;
      border: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
      background: ${unsafeCSSVarV2('layer/background/primary')};
      color: ${unsafeCSSVarV2('text/primary')};
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      outline: none;
    }

    .mermaid-split-body {
      display: grid;
      grid-template-columns: 1fr;
      min-height: 320px;
      flex: 1;
    }

    .mermaid-split-body.with-editor {
      grid-template-columns: minmax(260px, 42%) 1fr;
    }

    @media (max-width: 720px) {
      .mermaid-split-body.with-editor {
        grid-template-columns: 1fr;
      }
    }

    .mermaid-editor-pane {
      display: flex;
      flex-direction: column;
      border-right: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
      background: ${unsafeCSSVarV2('layer/background/secondary')};
    }

    .mermaid-editor-subheader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      font-size: 11px;
      color: ${unsafeCSSVarV2('text/secondary')};
      border-bottom: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
    }

    .mermaid-live-textarea {
      flex: 1;
      width: 100%;
      min-height: 270px;
      padding: 12px;
      border: none;
      outline: none;
      resize: vertical;
      box-sizing: border-box;
      background: transparent;
      color: ${unsafeCSSVarV2('text/primary')};
      font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco,
        Consolas, monospace;
      font-size: 12.5px;
      line-height: 1.55;
      tab-size: 2;
    }

    .mermaid-canvas-pane {
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 320px;
      background: ${unsafeCSSVarV2('layer/background/primary')};
    }

    .mermaid-preview-container {
      width: 100%;
      flex: 1;
      min-height: 300px;
      max-height: 620px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      overflow: hidden;
      position: relative;
      cursor: grab;
      box-sizing: border-box;
    }

    .mermaid-preview-wrapper.fullscreen .mermaid-preview-container {
      max-height: none;
    }

    .mermaid-preview-container:active {
      cursor: grabbing;
    }

    .mermaid-preview-svg {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.08s ease-out;
    }

    .mermaid-preview-svg > div {
      display: flex;
      justify-content: center;
      width: 100%;
      transform-origin: center;
    }

    .mermaid-preview-svg svg {
      transform-origin: center;
      max-width: 100%;
      height: auto;
    }

    .mermaid-controls {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 4px;
      z-index: 10;
    }

    .mermaid-control-button {
      min-width: 28px;
      height: 28px;
      padding: 0 6px;
      border: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
      border-radius: 6px;
      background: ${unsafeCSSVarV2('layer/background/primary')};
      color: ${unsafeCSSVarV2('text/primary')};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.15s ease;
    }

    .mermaid-control-button:hover {
      background: ${unsafeCSSVarV2('layer/background/hoverOverlay')};
    }

    .mermaid-scale-info {
      position: absolute;
      bottom: 8px;
      left: 8px;
      background: ${unsafeCSSVarV2('layer/background/overlayPanel')};
      border: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 11px;
      color: ${unsafeCSSVarV2('text/secondary')};
      z-index: 10;
      pointer-events: none;
    }

    .mermaid-error-banner {
      padding: 10px 14px;
      border-top: 1px solid rgba(239, 68, 68, 0.35);
      background: rgba(239, 68, 68, 0.09);
      color: ${unsafeCSSVarV2('button/error')};
      font-family: 'IBM Plex Mono', ui-monospace, monospace;
      font-size: 11.5px;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .mermaid-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 24px;
      text-align: center;
      color: ${unsafeCSSVarV2('text/secondary')};
    }

    .mermaid-template-chips {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px;
      margin-top: 4px;
    }
  `;

  @property({ attribute: false })
  accessor model: CodeBlockModel | null = null;

  @property({ attribute: false })
  accessor mermaidCode: string | null = null;

  @state()
  accessor state: 'loading' | 'error' | 'finish' | 'fallback' = 'loading';

  @state()
  accessor svgContent: string = '';

  @state()
  accessor errorMessage: string = '';

  @state()
  accessor showEditor: boolean = true;

  @state()
  accessor isFullscreen: boolean = false;

  @state()
  accessor copiedSvg: boolean = false;

  @state()
  accessor draftCode: string = '';

  @query('.mermaid-preview-container')
  accessor container!: HTMLDivElement;

  private mermaid: Mermaid | null = null;
  private renderTimeout: ReturnType<typeof setTimeout> | null = null;
  private isRendering = false;
  private _isEditingInternally = false;
  private _themeObserver: MutationObserver | null = null;
  private _lastThemeIsDark: boolean | null = null;

  // zoom and pan
  private scale = 1;
  private translateX = 0;
  private translateY = 0;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  get isReadonly(): boolean {
    return this.model?.store.readonly ?? false;
  }

  override firstUpdated(_changedProperties: PropertyValues): void {
    this.draftCode = this.model?.props.text.toString() ?? this.mermaidCode ?? '';
    if (this.isReadonly) {
      this.showEditor = false;
    }

    this._loadMermaid().catch(error => {
      console.error('Failed to load mermaid in firstUpdated:', error);
    });
    this._scheduleRender(0);
    this._setupEventListeners();
    this._setupThemeObserver();

    if (this.model) {
      this.disposables.add(
        this.model.props.text$.subscribe(() => {
          if (!this._isEditingInternally) {
            this.draftCode = this.model?.props.text.toString() ?? '';
          }
          this._scheduleRender();
        })
      );
    }
  }

  override willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('mermaidCode') && !this.model) {
      this.draftCode = this.mermaidCode ?? '';
      this._scheduleRender();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
      this.renderTimeout = null;
    }
    if (this._themeObserver) {
      this._themeObserver.disconnect();
      this._themeObserver = null;
    }
  }

  get normalizedMermaidCode(): string {
    const raw =
      this.model?.props.text.toString() ?? this.mermaidCode ?? this.draftCode;
    return normalizeMermaidCode(raw);
  }

  private _detectDarkMode(): boolean {
    if (typeof document === 'undefined') return false;
    const rootTheme = document.documentElement.dataset.theme;
    if (rootTheme === 'dark') return true;
    if (rootTheme === 'light') return false;
    try {
      return getComputedStyle(this).colorScheme === 'dark';
    } catch {
      return false;
    }
  }

  private _setupThemeObserver() {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
      return;
    }
    this._themeObserver = new MutationObserver(() => {
      const isDark = this._detectDarkMode();
      if (this._lastThemeIsDark !== isDark) {
        this._configureMermaidTheme(isDark);
        this._scheduleRender(20);
      }
    });
    this._themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
  }

  private _configureMermaidTheme(isDark: boolean) {
    if (!this.mermaid) return;
    this._lastThemeIsDark = isDark;
    this.mermaid.initialize({
      startOnLoad: false,
      suppressErrorRendering: true,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily:
        'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
      sequence: {
        useMaxWidth: true,
      },
      gantt: {
        useMaxWidth: true,
      },
      pie: {
        useMaxWidth: true,
      },
      journey: {
        useMaxWidth: true,
      },
      gitGraph: {
        useMaxWidth: true,
      },
    });
  }

  private _scheduleRender(delayMs = 120) {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }

    this.renderTimeout = setTimeout(() => {
      this._render().catch(error => {
        console.error('Failed to render in timeout:', error);
      });
    }, delayMs);
  }

  private readonly _resetTransform = () => {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this._updateTransform();
  };

  private readonly _zoomIn = () => {
    this.scale = Math.min(this.scale * 1.2, 5);
    this._updateTransform();
  };

  private readonly _zoomOut = () => {
    this.scale = Math.max(this.scale / 1.2, 0.1);
    this._updateTransform();
  };

  private _updateTransform() {
    this.requestUpdate();
  }

  private readonly _handleMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return;
    this.isDragging = true;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    if (this.container) {
      this.container.style.cursor = 'grabbing';
    }
  };

  private readonly _handleMouseMove = (event: MouseEvent) => {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;

    this.translateX += deltaX;
    this.translateY += deltaY;

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;

    this._updateTransform();
  };

  private readonly _handleMouseUp = () => {
    if (!this.isDragging) return;
    this.isDragging = false;
    if (this.container) {
      this.container.style.cursor = 'grab';
    }
  };

  private readonly _handleWheel = (event: WheelEvent) => {
    // Only intercept wheel for zoom when Ctrl/Meta is held or in fullscreen mode
    if (!event.ctrlKey && !event.metaKey && !this.isFullscreen) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const next = computeWheelZoom({
      scale: this.scale,
      translateX: this.translateX,
      translateY: this.translateY,
      deltaY: event.deltaY,
      mouseX,
      mouseY,
    });

    this.scale = next.scale;
    this.translateX = next.translateX;
    this.translateY = next.translateY;

    this._updateTransform();
  };

  private _setupEventListeners() {
    this.disposables.addFromEvent(document, 'mousemove', this._handleMouseMove);
    this.disposables.addFromEvent(document, 'mouseup', this._handleMouseUp);
  }

  private async _loadMermaid() {
    try {
      const mermaidModule = await import('mermaid');
      this.mermaid = mermaidModule.default;
      this._configureMermaidTheme(this._detectDarkMode());
    } catch (error) {
      console.error('Failed to load mermaid:', error);
      this.errorMessage =
        error instanceof Error ? error.message : 'No se pudo cargar Mermaid.';
      this.state = 'error';
    }
  }

  private _cleanupStrayMermaidDom(diagramId: string) {
    if (typeof document === 'undefined') return;
    const strayIds = [diagramId, `d${diagramId}`];
    for (const id of strayIds) {
      const el = document.getElementById(id);
      if (el && !this.contains(el)) {
        el.remove();
      }
    }
  }

  private async _render() {
    if (this.isRendering) {
      return;
    }

    const code = this.normalizedMermaidCode;
    if (!code) {
      this.errorMessage = '';
      this.svgContent = '';
      this.state = 'fallback';
      if (!this.isReadonly) {
        this.showEditor = true;
      }
      return;
    }

    this.isRendering = true;
    if (!this.svgContent) {
      this.state = 'loading';
    }

    if (!this.mermaid) {
      await this._loadMermaid();
    }
    if (!this.mermaid) {
      this.isRendering = false;
      return;
    }

    const isDark = this._detectDarkMode();
    if (this._lastThemeIsDark !== isDark) {
      this._configureMermaidTheme(isDark);
    }

    const diagramId = `mermaid-diagram-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      await this.mermaid.parse(code);
      const { svg } = await this.mermaid.render(diagramId, code);
      this._cleanupStrayMermaidDom(diagramId);

      this.svgContent = svg;
      this.errorMessage = '';
      this.state = 'finish';
    } catch (error) {
      this._cleanupStrayMermaidDom(diagramId);
      const rawMessage =
        error instanceof Error ? error.message : String(error ?? 'Syntax error');
      this.errorMessage = rawMessage.trim();

      if (this.svgContent) {
        // Keep last valid diagram visible while showing live syntax error banner
        this.state = 'finish';
      } else {
        this.state = 'error';
        if (!this.isReadonly) {
          this.showEditor = true;
        }
      }
    } finally {
      this.isRendering = false;
    }
  }

  private _applyCodeUpdate(newCode: string) {
    this.draftCode = newCode;
    if (this.model && !this.isReadonly) {
      this._isEditingInternally = true;
      try {
        this.model.store.transact(() => {
          this.model!.props.text.replace(
            0,
            this.model!.props.text.length,
            newCode
          );
        });
      } finally {
        this._isEditingInternally = false;
      }
    } else {
      this.mermaidCode = newCode;
    }
    this._scheduleRender(120);
  }

  private readonly _handleTextareaInput = (event: Event) => {
    event.stopPropagation();
    const target = event.target as HTMLTextAreaElement;
    this._applyCodeUpdate(target.value);
  };

  private readonly _handleTextareaKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === 'Tab') {
      event.preventDefault();
      const target = event.target as HTMLTextAreaElement;
      const start = target.selectionStart ?? 0;
      const end = target.selectionEnd ?? 0;
      const value = target.value;
      const nextValue = `${value.slice(0, start)}  ${value.slice(end)}`;
      target.value = nextValue;
      target.selectionStart = target.selectionEnd = start + 2;
      this._applyCodeUpdate(nextValue);
    } else if (event.key === 'Escape' && this.isFullscreen) {
      event.preventDefault();
      this.isFullscreen = false;
    }
  };

  private readonly _handleTemplateChange = (event: Event) => {
    event.stopPropagation();
    const select = event.target as HTMLSelectElement;
    const preset = MERMAID_TEMPLATES.find(t => t.id === select.value);
    if (preset) {
      this._applyCodeUpdate(preset.code);
      this._resetTransform();
    }
    select.value = '';
  };

  private readonly _copySvg = async () => {
    if (!this.svgContent) return;
    try {
      await navigator.clipboard.writeText(this.svgContent);
      this.copiedSvg = true;
      setTimeout(() => {
        this.copiedSvg = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy SVG:', err);
    }
  };

  private readonly _downloadSvg = () => {
    if (!this.svgContent) return;
    const blob = new Blob([this.svgContent], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagrama-mermaid-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  override render() {
    const hasError = Boolean(this.errorMessage);
    const hasSvg = Boolean(this.svgContent);

    return html`
      <div
        class=${classMap({
          'mermaid-preview-wrapper': true,
          fullscreen: this.isFullscreen,
        })}
      >
        <div class="mermaid-header-bar">
          <div class="mermaid-header-left">
            <span class="mermaid-badge">📊 Mermaid Pro</span>
            ${hasError
              ? html`<span class="mermaid-status-pill err">
                  ⚠ Error de sintaxis
                </span>`
              : hasSvg
                ? html`<span class="mermaid-status-pill ok">
                    ✓ Diagrama listo
                  </span>`
                : nothing}
            ${!this.isReadonly
              ? html`
                  <button
                    type="button"
                    class=${classMap({
                      'mermaid-toolbar-btn': true,
                      active: this.showEditor,
                    })}
                    @click=${() => {
                      this.showEditor = !this.showEditor;
                    }}
                    title="Mostrar u ocultar el editor de código en vivo junto al diagrama"
                  >
                    ${this.showEditor
                      ? '⇄ Split: Código + Diagrama'
                      : '✎ Editar Código'}
                  </button>
                  <select
                    class="mermaid-template-select"
                    @change=${this._handleTemplateChange}
                    title="Insertar plantilla de diagrama Mermaid"
                  >
                    <option value="">✨ Plantillas...</option>
                    ${MERMAID_TEMPLATES.map(
                      t => html`<option value=${t.id}>${t.label}</option>`
                    )}
                  </select>
                `
              : nothing}
          </div>

          <div class="mermaid-header-right">
            ${hasSvg
              ? html`
                  <button
                    type="button"
                    class="mermaid-toolbar-btn"
                    @click=${this._copySvg}
                    title="Copiar código SVG al portapapeles"
                  >
                    ${this.copiedSvg ? '✓ ¡Copiado!' : 'Copiar SVG'}
                  </button>
                  <button
                    type="button"
                    class="mermaid-toolbar-btn"
                    @click=${this._downloadSvg}
                    title="Descargar archivo .svg"
                  >
                    ⬇ SVG
                  </button>
                `
              : nothing}
            <button
              type="button"
              class=${classMap({
                'mermaid-toolbar-btn': true,
                active: this.isFullscreen,
              })}
              @click=${() => {
                this.isFullscreen = !this.isFullscreen;
              }}
              title="Alternar pantalla completa"
            >
              ${this.isFullscreen ? '✕ Salir' : '⛶ Ampliar'}
            </button>
          </div>
        </div>

        <div
          class=${classMap({
            'mermaid-split-body': true,
            'with-editor': this.showEditor && !this.isReadonly,
          })}
        >
          ${this.showEditor && !this.isReadonly
            ? html`
                <div class="mermaid-editor-pane">
                  <div class="mermaid-editor-subheader">
                    <span>Código Mermaid (en vivo)</span>
                    <span>Tab = 2 espacios</span>
                  </div>
                  <textarea
                    class="mermaid-live-textarea"
                    spellcheck="false"
                    placeholder="Escribe tu diagrama Mermaid aquí (ej. flowchart TD)..."
                    .value=${this.draftCode}
                    @input=${this._handleTextareaInput}
                    @keydown=${this._handleTextareaKeyDown}
                    @keyup=${(e: KeyboardEvent) => e.stopPropagation()}
                    @keypress=${(e: KeyboardEvent) => e.stopPropagation()}
                    @beforeinput=${(e: InputEvent) => e.stopPropagation()}
                    @paste=${(e: ClipboardEvent) => e.stopPropagation()}
                    @copy=${(e: ClipboardEvent) => e.stopPropagation()}
                    @cut=${(e: ClipboardEvent) => e.stopPropagation()}
                    @mousedown=${(e: MouseEvent) => e.stopPropagation()}
                    @pointerdown=${(e: PointerEvent) => e.stopPropagation()}
                    @click=${(e: MouseEvent) => e.stopPropagation()}
                  ></textarea>
                </div>
              `
            : nothing}

          <div class="mermaid-canvas-pane">
            <div
              class="mermaid-preview-container"
              @mousedown=${this._handleMouseDown}
              @wheel=${this._handleWheel}
              @selectstart=${(e: Event) => e.preventDefault()}
            >
              ${this.state === 'loading' && !hasSvg
                ? html`
                    <div class="mermaid-empty-state">
                      <div>Renderizando diagrama Mermaid...</div>
                    </div>
                  `
                : nothing}
              ${this.state === 'fallback' && !hasSvg
                ? html`
                    <div class="mermaid-empty-state">
                      <div style="font-weight: 600;">
                        Diagrama Mermaid vacío
                      </div>
                      <div style="font-size: 12px;">
                        Escribe código en el panel izquierdo o elige una
                        plantilla para comenzar:
                      </div>
                      <div class="mermaid-template-chips">
                        ${MERMAID_TEMPLATES.map(
                          t => html`
                            <button
                              type="button"
                              class="mermaid-toolbar-btn"
                              @click=${() => {
                                this._applyCodeUpdate(t.code);
                                this._resetTransform();
                              }}
                            >
                              + ${t.label}
                            </button>
                          `
                        )}
                      </div>
                    </div>
                  `
                : nothing}
              ${this.state === 'error' && !hasSvg
                ? html`
                    <div class="mermaid-empty-state">
                      <div style="font-weight: 600; color: #ef4444;">
                        Error de sintaxis en el diagrama Mermaid
                      </div>
                      <div style="font-size: 12px;">
                        Corrige el código en el editor izquierdo o carga una
                        plantilla válida:
                      </div>
                      <div class="mermaid-template-chips">
                        ${MERMAID_TEMPLATES.slice(0, 4).map(
                          t => html`
                            <button
                              type="button"
                              class="mermaid-toolbar-btn"
                              @click=${() => {
                                this._applyCodeUpdate(t.code);
                                this._resetTransform();
                              }}
                            >
                              Restaurar ${t.label}
                            </button>
                          `
                        )}
                      </div>
                    </div>
                  `
                : nothing}
              ${hasSvg
                ? html`
                    <div
                      class="mermaid-preview-svg"
                      style=${styleMap({
                        transform: `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`,
                      })}
                    >
                      <div .innerHTML=${this.svgContent}></div>
                    </div>
                    <div class="mermaid-controls">
                      <button
                        type="button"
                        class="mermaid-control-button"
                        @click=${this._zoomOut}
                        title="Alejar (Ctrl + Rueda)"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        class="mermaid-control-button"
                        @click=${this._resetTransform}
                        title="Restablecer vista (100%)"
                      >
                        ${Math.round(this.scale * 100)}%
                      </button>
                      <button
                        type="button"
                        class="mermaid-control-button"
                        @click=${this._zoomIn}
                        title="Acercar (Ctrl + Rueda)"
                      >
                        +
                      </button>
                    </div>
                    <div class="mermaid-scale-info">
                      Arrastra para mover · Ctrl+Rueda para zoom
                    </div>
                  `
                : nothing}
            </div>

            ${hasError
              ? html`
                  <div class="mermaid-error-banner">
                    <strong>Diagnóstico Mermaid:</strong> ${this.errorMessage}
                  </div>
                `
              : nothing}
          </div>
        </div>
      </div>
    `;
  }
}

export function effects() {
  if (!customElements.get('mermaid-preview')) {
    customElements.define('mermaid-preview', MermaidPreview);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mermaid-preview': MermaidPreview;
  }
}
