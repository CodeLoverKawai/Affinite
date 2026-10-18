import {
  Button,
  WeekDatePicker,
  type WeekDatePickerHandle,
} from '@affine/component';
import { BlocksuiteEditorJournalDocTitleUI } from '@affine/core/blocksuite/block-suite-editor/journal-doc-title';
import {
  formatWeeklyJournalKey,
  getWeekDateRange,
  isWeeklyJournalString,
  JOURNAL_DATE_FORMAT,
  JournalService,
} from '@affine/core/modules/journal';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewService,
  ViewTitle,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { TodayIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import type { Location } from 'history';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { AllDocSidebarTabs } from '../layouts/all-doc-sidebar-tabs';
import * as styles from './index.css';

export function getDateFromUrl(location: Location) {
  const searchParams = new URLSearchParams(location.search);
  const rawDate = searchParams.get('date');
  if (rawDate && isWeeklyJournalString(rawDate)) {
    return rawDate;
  }
  const date = rawDate ? dayjs(rawDate) : dayjs();
  return date.format(JOURNAL_DATE_FORMAT);
}

export const JournalPlaceholder = ({ dateString }: { dateString: string }) => {
  const t = useI18n();
  const [redirecting, setRedirecting] = useState(false);
  const workbench = useService(WorkbenchService).workbench;
  const journalService = useService(JournalService);
  const weekKey = isWeeklyJournalString(dateString)
    ? dateString
    : formatWeeklyJournalKey(dateString);

  const createJournal = useCallback(() => {
    if (redirecting) return;
    setRedirecting(true);
    const doc = journalService.ensureJournalByDate(dateString);
    workbench.openDoc(doc.id, {
      replaceHistory: true,
      at: 'active',
    });
  }, [dateString, journalService, redirecting, workbench]);

  const createWeeklyJournal = useCallback(() => {
    if (redirecting) return;
    setRedirecting(true);
    const doc = journalService.ensureWeeklyJournal(weekKey);
    workbench.openDoc(doc.id, {
      replaceHistory: true,
      at: 'active',
    });
  }, [journalService, redirecting, weekKey, workbench]);

  return (
    <div className={styles.body} data-mobile={BUILD_CONFIG.isMobileEdition}>
      <div className={styles.content}>
        <BlocksuiteEditorJournalDocTitleUI
          date={dateString}
          overrideClassName={styles.docTitleContainer}
        />
        <div className={styles.placeholder}>
          <div className={styles.placeholderIcon}>
            <TodayIcon />
          </div>
          <div className={styles.placeholderText}>
            {t['com.affine.journal.placeholder.title']()}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="primary"
              onClick={createJournal}
              data-testid="confirm-create-journal-button"
            >
              {t['com.affine.journal.placeholder.create']()}
            </Button>
            <Button
              onClick={createWeeklyJournal}
              data-testid="confirm-create-weekly-journal-button"
            >
              🗓️ Crear Nota Semanal ({weekKey})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const weekStyle = { maxWidth: 800, width: '100%' };
// this route page acts as a redirector to today's journal
export const JournalsPageWithConfirmation = () => {
  const handleRef = useRef<WeekDatePickerHandle>(null);

  const t = useI18n();
  const journalService = useService(JournalService);
  const workbench = useService(WorkbenchService).workbench;
  const view = useService(ViewService).view;
  const location = useLiveData(view.location$);
  const dateString = getDateFromUrl(location);
  const todayString = dayjs().format(JOURNAL_DATE_FORMAT);
  const isToday = dateString === todayString;
  const pickerDateValue = isWeeklyJournalString(dateString)
    ? getWeekDateRange(dateString).start.format(JOURNAL_DATE_FORMAT)
    : dateString;
  const activeWeekKey = isWeeklyJournalString(dateString)
    ? dateString
    : formatWeeklyJournalKey(dateString);

  const [ready, setReady] = useState(false);

  const openJournal = useCallback(
    (date: string) => {
      workbench.open(`/journals?date=${date}`, { at: 'active' });
    },
    [workbench]
  );

  const openWeeklyJournal = useCallback(() => {
    const doc = journalService.ensureWeeklyJournal(activeWeekKey);
    workbench.openDoc(doc.id, { at: 'active' });
  }, [activeWeekKey, journalService, workbench]);

  const openCalendar = useCallback(() => {
    workbench.open('/calendar', { at: 'active' });
  }, [workbench]);

  useLayoutEffect(() => {
    // only handle current route
    if (!location.pathname.startsWith('/journals')) return;

    // check if the journal is created
    const docs = journalService.journalsByDate$(dateString).value;
    if (docs.length === 0) {
      setReady(true);
      return;
    }

    // if created, redirect to the journal
    const journal = docs[0];
    workbench.openDoc(journal.id, { replaceHistory: true, at: 'active' });
  }, [dateString, journalService, location.pathname, view, workbench]);

  if (!ready) return null;

  return (
    <>
      <ViewTitle title="" />
      <ViewIcon icon="journal" />
      <ViewHeader>
        <div className={styles.header}>
          <WeekDatePicker
            data-testid="journal-week-picker"
            handleRef={handleRef}
            style={weekStyle}
            value={pickerDateValue}
            onChange={openJournal}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Button
              onClick={openWeeklyJournal}
              title={`Abrir o crear Nota Semanal (${activeWeekKey})`}
            >
              🗓️ Semanal ({activeWeekKey.split('-')[1]})
            </Button>
            <Button onClick={openCalendar} title="Ver Calendario Mensual">
              📅 Calendario
            </Button>
            {!isToday ? (
              <Button
                className={styles.todayButton}
                onClick={() => openJournal(todayString)}
              >
                {t['com.affine.today']()}
              </Button>
            ) : null}
          </div>
        </div>
      </ViewHeader>
      <ViewBody>
        <JournalPlaceholder dateString={dateString} />
      </ViewBody>
      <AllDocSidebarTabs />
    </>
  );
};

export const Component = () => {
  return <JournalsPageWithConfirmation />;
};
