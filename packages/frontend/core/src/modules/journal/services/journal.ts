import { Text } from '@blocksuite/affine/store';
import { LiveData, Service } from '@toeverything/infra';
import dayjs from 'dayjs';

import type { DocsService } from '../../doc';
import type { TemplateDocService } from '../../template-doc';
import {
  formatWeeklyJournalKey,
  getWeekDateRange,
  isWeeklyJournalString,
  type JournalStore,
} from '../store/journal';

export type MaybeDate = Date | string | number | dayjs.Dayjs;

export const JOURNAL_DATE_FORMAT = 'YYYY-MM-DD';

export class JournalService extends Service {
  constructor(
    private readonly store: JournalStore,
    private readonly docsService: DocsService,
    private readonly templateDocService: TemplateDocService
  ) {
    super();
  }

  allJournalDates$ = this.store.allJournalDates$;

  journalDate$(docId: string) {
    return LiveData.from(this.store.watchDocJournalDate(docId), undefined);
  }
  journalToday$(docId: string) {
    return LiveData.computed(get => {
      const date = get(this.journalDate$(docId));
      if (!date) return false;
      if (isWeeklyJournalString(date)) {
        return date === formatWeeklyJournalKey(dayjs());
      }
      return dayjs(date).isSame(dayjs(), 'day');
    });
  }

  setJournalDate(docId: string, date: string) {
    this.store.setDocJournalDate(docId, date);
  }

  removeJournalDate(docId: string) {
    this.store.removeDocJournalDate(docId);
  }

  journalsByDate$(date: string) {
    return this.store.docsByJournalDate$(date);
  }

  journalsByWeek$(weekKey: string) {
    return this.store.docsByJournalDate$(weekKey);
  }

  weeklyJournalsByDate$(date?: dayjs.ConfigType) {
    const weekKey =
      typeof date === 'string' && isWeeklyJournalString(date)
        ? date
        : formatWeeklyJournalKey(date);
    return this.store.docsByJournalDate$(weekKey);
  }

  private createJournal(maybeDate: MaybeDate) {
    const day = dayjs(maybeDate);
    const title = day.format(JOURNAL_DATE_FORMAT);
    const docRecord = this.docsService.createDoc({
      title,
    });
    // set created date to match the journal date
    docRecord.setMeta({
      createDate: dayjs()
        .set('year', day.year())
        .set('month', day.month())
        .set('date', day.date())
        .toDate()
        .getTime(),
    });

    const enablePageTemplate =
      this.templateDocService.setting.enablePageTemplate$.value;
    const pageTemplateDocId =
      this.templateDocService.setting.pageTemplateDocId$.value;
    const journalTemplateDocId =
      this.templateDocService.setting.journalTemplateDocId$.value;
    // if journal template configured
    if (journalTemplateDocId) {
      this.docsService
        .duplicateFromTemplate(journalTemplateDocId, docRecord.id)
        .catch(console.error);
    }
    // journal template not configured, use page template
    else if (enablePageTemplate && pageTemplateDocId) {
      this.docsService
        .duplicateFromTemplate(pageTemplateDocId, docRecord.id)
        .catch(console.error);
    }
    this.setJournalDate(docRecord.id, title);
    return docRecord;
  }

  private createWeeklyJournal(weekKey: string) {
    const { start, end, weekNumber } = getWeekDateRange(weekKey);
    const title = `${weekKey} · Semana ${weekNumber} (${start.format('DD MMM')} – ${end.format('DD MMM')})`;
    const docRecord = this.docsService.createDoc({
      title,
      docProps: {
        onStoreLoad: (doc, { noteId, paragraphId }) => {
          const initialPara = doc.getBlock(paragraphId)?.model;
          if (initialPara) {
            doc.deleteBlock(initialPara);
          }

          doc.addBlock(
            'affine:paragraph',
            {
              type: 'h2',
              text: new Text('🎯 Objetivos Principales de la Semana'),
            },
            noteId
          );
          doc.addBlock(
            'affine:list',
            {
              type: 'todo',
              text: new Text('Objetivo principal #1 de la semana'),
            },
            noteId
          );
          doc.addBlock(
            'affine:list',
            {
              type: 'todo',
              text: new Text('Objetivo principal #2 de la semana'),
            },
            noteId
          );
          doc.addBlock(
            'affine:list',
            {
              type: 'todo',
              text: new Text('Objetivo principal #3 de la semana'),
            },
            noteId
          );

          doc.addBlock(
            'affine:paragraph',
            {
              type: 'h2',
              text: new Text('🔥 Prioridades & Entregables'),
            },
            noteId
          );
          doc.addBlock(
            'affine:list',
            {
              type: 'bulleted',
              text: new Text('Entregable clave: '),
            },
            noteId
          );
          doc.addBlock(
            'affine:list',
            {
              type: 'bulleted',
              text: new Text('Foco / Bloqueos a resolver: '),
            },
            noteId
          );

          doc.addBlock(
            'affine:paragraph',
            {
              type: 'h2',
              text: new Text('📅 Plan por Días (Lunes a Domingo)'),
            },
            noteId
          );
          const days = [
            `Lunes (${start.format('DD MMM')}): `,
            `Martes (${start.add(1, 'day').format('DD MMM')}): `,
            `Miércoles (${start.add(2, 'day').format('DD MMM')}): `,
            `Jueves (${start.add(3, 'day').format('DD MMM')}): `,
            `Viernes (${start.add(4, 'day').format('DD MMM')}): `,
            `Fin de Semana (${start.add(5, 'day').format('DD MMM')} – ${end.format('DD MMM')}): `,
          ];
          for (const dayLabel of days) {
            doc.addBlock(
              'affine:list',
              {
                type: 'bulleted',
                text: new Text(dayLabel),
              },
              noteId
            );
          }

          doc.addBlock(
            'affine:paragraph',
            {
              type: 'h2',
              text: new Text('🔄 Revisión Semanal & Notas'),
            },
            noteId
          );
          doc.addBlock(
            'affine:paragraph',
            {
              type: 'text',
              text: new Text(''),
            },
            noteId
          );
        },
      },
    });

    docRecord.setMeta({
      createDate: start.toDate().getTime(),
    });
    this.setJournalDate(docRecord.id, weekKey);
    return docRecord;
  }

  ensureJournalByDate(maybeDate: MaybeDate) {
    if (typeof maybeDate === 'string' && isWeeklyJournalString(maybeDate)) {
      return this.ensureWeeklyJournal(maybeDate);
    }
    const day = dayjs(maybeDate);
    const title = day.format(JOURNAL_DATE_FORMAT);
    const docs = this.journalsByDate$(title).value;
    if (docs.length) return docs[0];
    return this.createJournal(maybeDate);
  }

  ensureWeeklyJournal(maybeDate?: dayjs.ConfigType) {
    const weekKey =
      typeof maybeDate === 'string' && isWeeklyJournalString(maybeDate)
        ? maybeDate
        : formatWeeklyJournalKey(maybeDate);
    const docs = this.journalsByDate$(weekKey).value;
    if (docs.length) return docs[0];
    return this.createWeeklyJournal(weekKey);
  }
}
