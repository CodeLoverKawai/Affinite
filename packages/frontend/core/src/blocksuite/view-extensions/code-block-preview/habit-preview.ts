import { CodeBlockPreviewExtension } from '@blocksuite/affine/blocks/code';
import { SignalWatcher, WithDisposable } from '@blocksuite/affine/global/lit';
import type { CodeBlockModel } from '@blocksuite/affine/model';
import { unsafeCSSVarV2 } from '@blocksuite/affine/shared/theme';
import { ShadowlessElement } from '@blocksuite/std';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { css, html, nothing, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';

import {
  getHabitWeekDaysStatus,
  parseHabitCardData,
  serializeHabitCardData,
  toggleHabitEntry,
  type HabitCardData,
} from '../../../desktop/pages/workspace/habits/habit-card-helpers';
import {
  calculateStreak,
  isHabitDoneOnDate,
  normalizeHabitId,
  parseHabitsPayload,
  resolveHabitById,
  type HabitItem,
} from '../../../desktop/pages/workspace/habits/habits-calculator';
import { resolveRootYDoc } from '@affine/core/modules/affinite-hub/yjs-root';

dayjs.extend(isoWeek);

const HABITS_YMAP_KEY = 'affinite_habits_v1';

export const DEFAULT_HABITS: HabitItem[] = [
  {
    id: 'habit-water',
    title: 'Tomar 2L de Agua',
    icon: '💧',
    category: 'Salud',
    type: 'quantitative',
    targetValue: 2000,
    unit: 'ml',
    frequency: 'daily',
    createdAt: '2026-10-01',
    entries: {},
  },
  {
    id: 'habit-exercise',
    title: 'Ejercicio / Caminata 30 min',
    icon: '🏃',
    category: 'Fitness',
    type: 'boolean',
    frequency: 'daily',
    createdAt: '2026-10-01',
    entries: {},
  },
  {
    id: 'habit-reading',
    title: 'Lectura 20 Páginas',
    icon: '📚',
    category: 'Estudio',
    type: 'quantitative',
    targetValue: 20,
    unit: 'págs',
    frequency: 'daily',
    createdAt: '2026-10-01',
    entries: {},
  },
  {
    id: 'habit-meditation',
    title: 'Meditación & Respiración',
    icon: '🧘',
    category: 'Mente',
    type: 'boolean',
    frequency: 'daily',
    createdAt: '2026-10-01',
    entries: {},
  },
  {
    id: 'habit-code',
    title: 'Progreso en Código / Proyecto',
    icon: '💻',
    category: 'Productividad',
    type: 'boolean',
    frequency: 'daily',
    createdAt: '2026-10-01',
    entries: {},
  },
];

export const CodeBlockHabitPreview = CodeBlockPreviewExtension(
  'habit',
  model => html`<habit-preview .model=${model}></habit-preview>`
);

export class HabitPreview extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  static override styles = css`
    .habit-card-wrapper {
      width: 100%;
      border: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
      border-radius: 12px;
      background: ${unsafeCSSVarV2('layer/background/primary')};
      overflow: hidden;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      margin: 8px 0;
      transition: all 0.2s ease;
    }

    .habit-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
      background: ${unsafeCSSVarV2('layer/background/secondary')};
    }

    .habit-badge-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .habit-main-icon {
      font-size: 20px;
      line-height: 1;
    }

    .habit-title-text {
      font-weight: 600;
      font-size: 14px;
      color: ${unsafeCSSVarV2('text/primary')};
    }

    .habit-category-pill {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 9999px;
      background: rgba(99, 102, 241, 0.12);
      color: #6366f1;
      font-weight: 500;
    }

    .habit-actions-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .habit-header-btn {
      padding: 4px 8px;
      font-size: 11px;
      border-radius: 6px;
      border: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
      background: ${unsafeCSSVarV2('layer/background/primary')};
      color: ${unsafeCSSVarV2('text/secondary')};
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .habit-header-btn:hover {
      background: ${unsafeCSSVarV2('layer/background/hoverOverlay')};
      color: ${unsafeCSSVarV2('text/primary')};
    }

    .habit-card-body {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .habit-main-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .habit-toggle-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid transparent;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .habit-toggle-btn.done {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.4);
      color: #10b981;
    }

    .habit-toggle-btn.done:hover {
      background: rgba(16, 185, 129, 0.25);
    }

    .habit-toggle-btn.pending {
      background: ${unsafeCSSVarV2('layer/background/secondary')};
      border-color: ${unsafeCSSVarV2('layer/insideBorder/border')};
      color: ${unsafeCSSVarV2('text/primary')};
    }

    .habit-toggle-btn.pending:hover {
      background: ${unsafeCSSVarV2('layer/background/hoverOverlay')};
      border-color: rgba(99, 102, 241, 0.4);
    }

    .habit-check-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid currentColor;
      font-size: 12px;
      font-weight: 800;
    }

    .habit-streak-display {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #f59e0b;
      padding: 6px 12px;
      border-radius: 8px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    .habit-week-strip {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      border-radius: 8px;
      background: ${unsafeCSSVarV2('layer/background/secondary')};
      justify-content: space-between;
    }

    .habit-day-dot-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      transition: background 0.15s ease;
    }

    .habit-day-dot-btn:hover {
      background: ${unsafeCSSVarV2('layer/background/hoverOverlay')};
    }

    .habit-day-name {
      font-size: 10px;
      font-weight: 500;
      color: ${unsafeCSSVarV2('text/secondary')};
    }

    .habit-day-circle {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 1.5px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      transition: all 0.2s ease;
    }

    .habit-day-circle.done {
      background: #10b981;
      border-color: #10b981;
      color: white;
    }

    .habit-day-circle.today {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
    }

    .habit-date-context {
      font-size: 11px;
      color: ${unsafeCSSVarV2('text/secondary')};
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .habit-code-editor {
      width: 100%;
      min-height: 100px;
      padding: 10px;
      border: none;
      outline: none;
      background: ${unsafeCSSVarV2('layer/background/secondary')};
      color: ${unsafeCSSVarV2('text/primary')};
      font-family: 'IBM Plex Mono', monospace;
      font-size: 12px;
      resize: vertical;
      box-sizing: border-box;
    }
  `;

  @property({ attribute: false })
  accessor model!: CodeBlockModel;

  @state()
  private accessor showCode = false;

  private _cardData: HabitCardData | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this._parseData();
    try {
      const yMap = this.getYMap();
      if (yMap && typeof yMap.observe === 'function') {
        const observer = () => this.requestUpdate();
        yMap.observe(observer);
        this.disposables.add(() => yMap.unobserve(observer));
      }
    } catch {
      // Ignore observer error
    }
  }

  override willUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has('model')) {
      this._parseData();
    }
  }

  private _parseData() {
    const raw = this.model?.text?.toString() || '';
    this._cardData = parseHabitCardData(raw, dayjs().format('YYYY-MM-DD'));
  }

  private getYMap() {
    const candidateDoc =
      (this.model as any)?.store?.spaceDoc ??
      (this.model as any)?.store?.workspace?.doc ??
      (this.model as any)?.doc?.docCollection?.doc ??
      (this.model as any)?.store?.doc?.rootDoc ??
      null;
    const root = candidateDoc ? resolveRootYDoc(candidateDoc) : null;
    return root?.getMap ? root.getMap(HABITS_YMAP_KEY) : null;
  }

  private _getWorkspaceHabits(): HabitItem[] {
    try {
      const yMap = this.getYMap();
      if (yMap && yMap.has('habits')) {
        const parsed = parseHabitsPayload(yMap.get('habits'));
        if (parsed && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fall through
    }

    return DEFAULT_HABITS.map(h => ({ ...h, entries: { ...h.entries } }));
  }

  private loadHabit(): HabitItem {
    const allHabits = this._getWorkspaceHabits();
    const data = this._cardData;
    const found = resolveHabitById(allHabits, data?.habitId, data?.title);

    if (found) return found;

    return {
      id: normalizeHabitId(data?.habitId || 'habit-custom'),
      title: data?.title || 'Mi Hábito',
      icon: data?.icon || '🎯',
      category: data?.category || 'Personal',
      type: data?.type || 'boolean',
      targetValue: data?.targetValue,
      unit: data?.unit,
      frequency: 'daily',
      createdAt: data?.date || '2026-10-01',
      entries: {},
    };
  }

  private _getActiveHabit(): HabitItem {
    return this.loadHabit();
  }

  private saveHabitsList(newList: HabitItem[]) {
    try {
      const yMap = this.getYMap();
      if (yMap) {
        const serialized = JSON.stringify(newList);
        yMap.set('habits', serialized);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('affinite_habits_cache_v1', serialized);
        }
      }
    } catch (err) {
      console.warn('Could not persist habit to workspace Yjs map:', err);
    }
  }

  private _toggleEntry(targetDate: string) {
    const habit = this.loadHabit();
    const newEntries = toggleHabitEntry(
      habit.entries,
      targetDate,
      habit.type,
      habit.targetValue
    );

    const updatedHabit: HabitItem = {
      ...habit,
      entries: newEntries,
    };

    const list = this._getWorkspaceHabits();
    const existing = resolveHabitById(
      list,
      updatedHabit.id,
      updatedHabit.title
    );
    if (existing) {
      const idx = list.indexOf(existing);
      list[idx] = { ...existing, entries: newEntries };
    } else {
      list.push(updatedHabit);
    }

    this.saveHabitsList(list);

    // Force re-render
    this.requestUpdate();
  }

  private _switchHabit(habit: HabitItem) {
    const updatedData: HabitCardData = {
      habitId: habit.id,
      title: habit.title,
      icon: habit.icon,
      category: habit.category,
      type: habit.type,
      targetValue: habit.targetValue,
      unit: habit.unit,
      date: this._cardData?.date || dayjs().format('YYYY-MM-DD'),
    };

    this._cardData = updatedData;
    const jsonStr = serializeHabitCardData(updatedData);

    try {
      this.model.text?.replace(0, this.model.text.length, jsonStr);
    } catch {
      // Ignore text sync error
    }

    this.requestUpdate();
  }

  override render() {
    if (!this._cardData) return nothing;

    const habit = this._getActiveHabit();
    const targetDate = this._cardData.date || dayjs().format('YYYY-MM-DD');
    const isDone = isHabitDoneOnDate(
      habit.entries[targetDate],
      habit.type,
      habit.targetValue
    );

    const streak = calculateStreak(
      habit.entries,
      habit.type,
      habit.targetValue,
      targetDate
    );

    const weekDays = getHabitWeekDaysStatus(habit, undefined, targetDate);

    return html`
      <div class="habit-card-wrapper">
        <div class="habit-card-header">
          <div class="habit-badge-group">
            <span class="habit-main-icon">${habit.icon}</span>
            <span class="habit-title-text">${habit.title}</span>
            <span class="habit-category-pill">${habit.category}</span>
          </div>

          <div class="habit-actions-group">
            <select
              class="habit-header-btn"
              style="outline: none;"
              @change=${(e: Event) => {
                const selId = (e.target as HTMLSelectElement).value;
                const match = this._getWorkspaceHabits().find(h => h.id === selId);
                if (match) this._switchHabit(match);
              }}
            >
              ${this._getWorkspaceHabits().map(
                h => html`
                  <option value=${h.id} ?selected=${h.id === habit.id}>
                    ${h.icon} ${h.title}
                  </option>
                `
              )}
            </select>

            <button
              type="button"
              class="habit-header-btn"
              @click=${() => {
                this.showCode = !this.showCode;
              }}
            >
              ${this.showCode ? '🎯 Vista Tarjeta' : '⚡ Código'}
            </button>
          </div>
        </div>

        ${this.showCode
          ? html`
              <textarea
                class="habit-code-editor"
                .value=${this.model.text?.toString() || ''}
                @input=${(e: Event) => {
                  const val = (e.target as HTMLTextAreaElement).value;
                  this.model.text?.replace(0, this.model.text.length, val);
                  this._parseData();
                }}
              ></textarea>
            `
          : html`
              <div class="habit-card-body">
                <div class="habit-main-row">
                  <button
                    type="button"
                    class="habit-toggle-btn ${isDone ? 'done' : 'pending'}"
                    @click=${() => this._toggleEntry(targetDate)}
                  >
                    <span class="habit-check-icon">
                      ${isDone ? '✓' : ''}
                    </span>
                    <span>
                      ${isDone
                        ? '¡Completado para hoy!'
                        : 'Marcar como completado'}
                    </span>
                  </button>

                  <div class="habit-streak-display">
                    <span>🔥</span>
                    <span>${streak.currentStreak} días de racha</span>
                    ${streak.bestStreak > 0
                      ? html`<span style="opacity: 0.7; font-size: 11px;">(Máx: ${streak.bestStreak})</span>`
                      : nothing}
                  </div>
                </div>

                <div class="habit-week-strip">
                  ${weekDays.map(
                    d => html`
                      <button
                        type="button"
                        class="habit-day-dot-btn"
                        title="${d.date} (${d.dayName})"
                        @click=${() => this._toggleEntry(d.date)}
                      >
                        <span class="habit-day-name">${d.dayName}</span>
                        <span
                          class="habit-day-circle ${d.isDone ? 'done' : ''} ${d.isToday ? 'today' : ''}"
                        >
                          ${d.isDone ? '✓' : ''}
                        </span>
                      </button>
                    `
                  )}
                </div>

                <div class="habit-date-context">
                  <span>📅</span>
                  <span>
                    Fecha de registro: <strong>${targetDate}</strong>
                    ${targetDate === dayjs().format('YYYY-MM-DD')
                      ? ' (Hoy)'
                      : ' (Nota del Diario)'}
                  </span>
                </div>
              </div>
            `}
      </div>
    `;
  }
}

export function effects() {
  if (!customElements.get('habit-preview')) {
    customElements.define('habit-preview', HabitPreview);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'habit-preview': HabitPreview;
  }
}
