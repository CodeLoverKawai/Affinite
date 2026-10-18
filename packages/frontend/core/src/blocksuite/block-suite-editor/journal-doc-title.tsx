import {
  formatWeeklyJournalKey,
  getWeekDateRange,
  isWeeklyJournalString,
  JournalService,
} from '@affine/core/modules/journal';
import { i18nTime, useI18n } from '@affine/i18n';
import type { Store } from '@blocksuite/affine/store';
import { useLiveData, useService } from '@toeverything/infra';
import dayjs from 'dayjs';

import * as styles from './styles.css';

export const BlocksuiteEditorJournalDocTitle = ({ page }: { page: Store }) => {
  const journalService = useService(JournalService);
  const journalDateStr = useLiveData(journalService.journalDate$(page.id));

  return <BlocksuiteEditorJournalDocTitleUI date={journalDateStr} />;
};

export const BlocksuiteEditorJournalDocTitleUI = ({
  date: dateStr,
  overrideClassName,
}: {
  date?: string;
  /**
   * The `doc-title-container` class style is defined in editor,
   * which means if we use this component outside editor, the style will not work,
   * so we provide a className to override
   */
  overrideClassName?: string;
}) => {
  const t = useI18n();
  const today = dayjs();

  if (dateStr && isWeeklyJournalString(dateStr)) {
    const { start, end, weekNumber } = getWeekDateRange(dateStr);
    const isCurrentWeek = dateStr === formatWeeklyJournalKey(today);
    const rangeLabel = `Nota Semanal · Sem ${weekNumber} (${start.format('DD MMM')} - ${end.format('DD MMM YYYY')})`;

    return (
      <div
        className={overrideClassName ?? 'doc-title-container'}
        data-testid="journal-title"
      >
        <span data-testid="date">{dateStr}</span>
        {isCurrentWeek ? (
          <span className={styles.titleTodayTag} data-testid="date-today-label">
            {rangeLabel}
          </span>
        ) : (
          <span className={styles.titleDayTag}>{rangeLabel}</span>
        )}
      </div>
    );
  }

  const localizedJournalDate = i18nTime(dateStr, {
    absolute: { accuracy: 'day' },
  });

  // TODO(catsjuice): i18n
  const date = dayjs(dateStr);
  const day = dayjs(date).format('dddd') ?? null;
  const isToday = date.isSame(today, 'day');

  return (
    <div
      className={overrideClassName ?? 'doc-title-container'}
      data-testid="journal-title"
    >
      <span data-testid="date">{localizedJournalDate}</span>
      {isToday ? (
        <span className={styles.titleTodayTag} data-testid="date-today-label">
          {t['com.affine.today']()}
        </span>
      ) : (
        <span className={styles.titleDayTag}>{day}</span>
      )}
    </div>
  );
};
