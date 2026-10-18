import { toast } from '@blocksuite/affine-components/toast';
import type {
  ListBlockModel,
  ParagraphBlockModel,
} from '@blocksuite/affine-model';
import { insertContent } from '@blocksuite/affine-rich-text';
import {
  ArrowDownBigIcon,
  ArrowUpBigIcon,
  CheckBoxCheckLinearIcon,
  CheckBoxCheckSolidIcon,
  CopyIcon,
  DeleteIcon,
  DualLinkIcon,
  NowIcon,
  TodayIcon,
  TomorrowIcon,
  YesterdayIcon,
} from '@blocksuite/icons/lit';
import { type DeltaInsert, Slice, Text } from '@blocksuite/store';
import { html } from 'lit';

import { slashMenuToolTips } from './tooltips';
import type { SlashMenuConfig } from './types';
import { formatDate, formatTime } from './utils';

export interface SlashMenuHabitItem {
  id: string;
  title: string;
  category: string;
  icon: string;
  type?: 'boolean' | 'quantitative';
  targetValue?: number;
  unit?: string;
}

export const DEFAULT_SLASH_HABITS: SlashMenuHabitItem[] = [
  {
    id: 'habit-water',
    title: 'Tomar 2L de Agua',
    category: 'Salud',
    icon: '💧',
    type: 'quantitative',
    targetValue: 2000,
    unit: 'ml',
  },
  {
    id: 'habit-exercise',
    title: 'Ejercicio / Caminata 30 min',
    category: 'Fitness',
    icon: '🏃',
    type: 'boolean',
  },
  {
    id: 'habit-reading',
    title: 'Lectura 20 Páginas',
    category: 'Estudio',
    icon: '📚',
    type: 'quantitative',
    targetValue: 20,
    unit: 'págs',
  },
  {
    id: 'habit-meditation',
    title: 'Meditación & Respiración',
    category: 'Mente',
    icon: '🧘',
    type: 'boolean',
  },
  {
    id: 'habit-code',
    title: 'Progreso en Código / Proyecto',
    category: 'Productividad',
    icon: '💻',
    type: 'boolean',
  },
];

export function getCachedHabits(): SlashMenuHabitItem[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem('affinite_habits_cache_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
  }
  return DEFAULT_SLASH_HABITS;
}

export const defaultSlashMenuConfig: SlashMenuConfig = {
  items: () => {
    const now = new Date();
    const tomorrow = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const habitsList = getCachedHabits();

    const insertHabitAsTodo = (
      std: any,
      model: any,
      h: SlashMenuHabitItem,
      checked = false
    ) => {
      const { host } = std;
      const parent = host.store.getParent(model);
      if (!parent) return;
      const index = parent.children.indexOf(model);
      if (index === -1) return;

      const targetStr = h.targetValue
        ? ` (${h.targetValue} ${h.unit || ''})`
        : '';
      const checkSuffix = checked ? ' ✅' : '';

      host.store.captureSync();
      host.store.addBlock(
        'affine:list',
        {
          type: 'todo',
          text: new Text(`${h.icon} ${h.title}${targetStr}${checkSuffix}`),
          checked,
        },
        parent,
        index + 1
      );

      if (model.text?.length === 0) {
        host.store.deleteBlock(model);
      }
    };

    const completeHabitToday = (h: SlashMenuHabitItem, std: any) => {
      const todayDate = new Date();
      const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

      try {
        const rootDoc =
          (std.store.doc as any)?.docCollection?.doc ||
          (std.store.workspace as any)?.doc;
        if (rootDoc) {
          const yMap = rootDoc.getMap('affinite_habits_v1');
          const raw = yMap.get('habits');
          let list = raw ? JSON.parse(raw) : habitsList;
          list = list.map((item: any) => {
            if (item.id === h.id) {
              return {
                ...item,
                entries: {
                  ...item.entries,
                  [todayStr]:
                    item.type === 'quantitative'
                      ? item.targetValue || 1
                      : true,
                },
              };
            }
            return item;
          });
          const serialized = JSON.stringify(list);
          yMap.set('habits', serialized);
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('affinite_habits_cache_v1', serialized);
          }
        }
      } catch (e) {
        console.warn('Could not sync completed habit to Yjs', e);
      }
    };

    return [
      // Habits Suite
      {
        name: '🎯 Insertar Todos los Hábitos',
        description: 'Checklist con todos los hábitos del día',
        icon: CheckBoxCheckSolidIcon({ style: 'color: #3b82f6' }),
        searchAlias: [
          'habits',
          'habitos',
          'habito',
          'todos',
          'todos los habitos',
          'rutina',
          'checklist',
          'seguimiento',
        ],
        group: '5_Hábitos@0',
        action: ({ std, model }) => {
          const { host } = std;
          const parent = host.store.getParent(model);
          if (!parent) return;
          const index = parent.children.indexOf(model);
          if (index === -1) return;

          host.store.captureSync();
          let insertIdx = index + 1;
          for (const h of habitsList) {
            const targetStr = h.targetValue
              ? ` (${h.targetValue} ${h.unit || ''})`
              : '';
            host.store.addBlock(
              'affine:list',
              {
                type: 'todo',
                text: new Text(`${h.icon} ${h.title}${targetStr}`),
                checked: false,
              },
              parent,
              insertIdx++
            );
          }
          if (model.text?.length === 0) {
            host.store.deleteBlock(model);
          }
          toast(std.host, `¡${habitsList.length} hábitos añadidos a la nota! 🎯`);
        },
      },
      ...habitsList.map((h, i) => ({
        name: `${h.icon} ${h.title}`,
        description: `Hábito de ${h.category}${h.targetValue ? ` · Meta: ${h.targetValue} ${h.unit || ''}` : ''}`,
        icon: html`<span style="font-size: 16px">${h.icon}</span>`,
        searchAlias: [
          'habito',
          'habitos',
          'habits',
          h.title.toLowerCase(),
          h.category.toLowerCase(),
          ...h.title.toLowerCase().split(' '),
        ],
        group: `5_Hábitos@${i + 1}` as const,
        action: ({ std, model }: any) => {
          insertHabitAsTodo(std, model, h, false);
          toast(std.host, `Hábito "${h.title}" añadido.`);
        },
      })),
      {
        name: '✅ Registrar Hábito Completado Hoy...',
        description: 'Marcar como cumplido hoy y añadir a la nota',
        icon: CheckBoxCheckSolidIcon({ style: 'color: #10b981' }),
        searchAlias: [
          'completar',
          'marcar',
          'log',
          'habito cumplido',
          'done',
          'habits',
          'habitos',
        ],
        group: '5_Hábitos@20',
        subMenu: habitsList.map(h => ({
          name: `${h.icon} ${h.title}`,
          description: `Marcar como completado hoy`,
          icon: html`<span style="font-size: 16px">${h.icon}</span>`,
          action: ({ std, model }: any) => {
            completeHabitToday(h, std);
            insertHabitAsTodo(std, model, h, true);
            toast(std.host, `¡Hábito "${h.title}" completado hoy! 🔥`);
          },
        })),
      },
      {
        name: '🔥 Ver Panel de Hábitos & Rachas',
        description: 'Abrir matriz, rachas y mapa de calor (/habits)',
        icon: html`<span style="font-size: 16px">🔥</span>`,
        searchAlias: ['habits', 'habitos', 'rachas', 'streaks', 'matriz'],
        group: '5_Hábitos@21',
        action: () => {
          try {
            window.history.pushState({}, '', '/habits');
            window.dispatchEvent(new PopStateEvent('popstate'));
          } catch {
            window.location.hash = '#/habits';
          }
        },
      },
      {
        name: 'Today',
        icon: TodayIcon(),
        tooltip: slashMenuToolTips['Today'],
        description: formatDate(now),
        group: '6_Date@0',
        action: ({ std, model }) => {
          insertContent(std, model, formatDate(now));
        },
      },
      {
        name: 'Tomorrow',
        icon: TomorrowIcon(),
        tooltip: slashMenuToolTips['Tomorrow'],
        description: formatDate(tomorrow),
        group: '6_Date@1',
        action: ({ std, model }) => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          insertContent(std, model, formatDate(tomorrow));
        },
      },
      {
        name: 'Yesterday',
        icon: YesterdayIcon(),
        tooltip: slashMenuToolTips['Yesterday'],
        description: formatDate(yesterday),
        group: '6_Date@2',
        action: ({ std, model }) => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          insertContent(std, model, formatDate(yesterday));
        },
      },
      {
        name: 'Now',
        icon: NowIcon(),
        tooltip: slashMenuToolTips['Now'],
        description: formatTime(now),
        group: '6_Date@3',
        action: ({ std, model }) => {
          insertContent(std, model, formatTime(now));
        },
      },
      {
        name: 'Move Up',
        description: 'Shift this line up.',
        icon: ArrowUpBigIcon(),
        tooltip: slashMenuToolTips['Move Up'],
        group: '8_Actions@0',
        action: ({ std, model }) => {
          const { host } = std;
          const previousSiblingModel = host.store.getPrev(model);
          if (!previousSiblingModel) return;

          const parentModel = host.store.getParent(previousSiblingModel);
          if (!parentModel) return;

          host.store.moveBlocks(
            [model],
            parentModel,
            previousSiblingModel,
            true
          );
        },
      },
      {
        name: 'Move Down',
        description: 'Shift this line down.',
        icon: ArrowDownBigIcon(),
        tooltip: slashMenuToolTips['Move Down'],
        group: '8_Actions@1',
        action: ({ std, model }) => {
          const { host } = std;
          const nextSiblingModel = host.store.getNext(model);
          if (!nextSiblingModel) return;

          const parentModel = host.store.getParent(nextSiblingModel);
          if (!parentModel) return;

          host.store.moveBlocks([model], parentModel, nextSiblingModel, false);
        },
      },
      {
        name: 'Copy',
        description: 'Copy this line to clipboard.',
        icon: CopyIcon(),
        tooltip: slashMenuToolTips['Copy'],
        group: '8_Actions@2',
        action: ({ std, model }) => {
          const slice = Slice.fromModels(std.store, [model]);

          std.clipboard
            .copy(slice)
            .then(() => {
              toast(std.host, 'Copied to clipboard');
            })
            .catch(e => {
              console.error(e);
            });
        },
      },
      {
        name: 'Duplicate',
        description: 'Create a duplicate of this line.',
        icon: DualLinkIcon(),
        tooltip: slashMenuToolTips['Copy'],
        group: '8_Actions@3',
        action: ({ std, model }) => {
          if (!model.text || !(model.text instanceof Text)) {
            console.error("Can't duplicate a block without text");
            return;
          }
          const { host } = std;
          const parent = host.store.getParent(model);
          if (!parent) {
            console.error(
              'Failed to duplicate block! Parent not found: ' +
                model.id +
                '|' +
                model.flavour
            );
            return;
          }
          const index = parent.children.indexOf(model);

          // FIXME: this clone is not correct
          host.store.addBlock(
            model.flavour,
            {
              type: (model as ParagraphBlockModel).props.type,
              text: new Text(
                (
                  model as ParagraphBlockModel
                ).props.text.toDelta() as DeltaInsert[]
              ),
              checked: (model as ListBlockModel).props.checked,
            },
            host.store.getParent(model),
            index
          );
        },
      },
      {
        name: 'Delete',
        description: 'Remove this line permanently.',
        searchAlias: ['remove'],
        icon: DeleteIcon(),
        tooltip: slashMenuToolTips['Delete'],
        group: '8_Actions@4',
        action: ({ std, model }) => {
          std.host.store.deleteBlock(model);
        },
      },
    ];
  },
};
