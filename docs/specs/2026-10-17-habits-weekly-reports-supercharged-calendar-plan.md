# Weekly Reports Hub, Supercharged Calendar & Full Habits Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the dedicated Weekly Reports hub (`/weekly-reports`) with 7-day Daily Note auto-connection, a supercharged Calendar (`/calendar`) with Day/Hourly Time-Blocking + filters + productivity stats, and the complete Habits tracking suite (`/habits`) synced across journals and calendar.

**Architecture:**
1. Build `WeeklyReportsPage` (`packages/frontend/core/src/desktop/pages/workspace/weekly-reports/index.tsx`), register `/weekly-reports` in `workbench-router.ts`, add `<WeeklyReportsButton />` in `root-app-sidebar/index.tsx` right below Journals, and add the automatic 7-day Daily Note aggregator & transclusion component.
2. Upgrade `packages/frontend/core/src/desktop/pages/workspace/calendar/index.tsx` with Day/Hourly Time-Blocking view (06:00 to 23:00), event search & category filter bars, color tagging, habit consistency indicators per day, and monthly productivity metrics.
3. Create the Habits module (`packages/frontend/core/src/desktop/pages/workspace/habits/index.tsx`), register `/habits` in `workbench-router.ts` and `root-app-sidebar/index.tsx`, implement weekly/monthly matrix, streaks, annual heatmap, and embed the interactive Habit Widget in Daily Notes, Weekly Reports, and Calendar.
4. Verify all tests in headless Vitest, compile Electron layers, and rebuild/install the updated Flatpak.

## Global Constraints

- Target branch: `feat/linux-performance-flatpak-offline`
- 100% Local-First: All habits, weekly report links, and calendar events must persist in workspace Yjs CRDT (`affinite_habits_v1`, `affinite_calendar_v1`) without requiring remote cloud servers.
- Vitest unit tests must pass cleanly.

---

### Task 1: Dedicated Weekly Reports Hub (`/weekly-reports`) & 7-Day Daily Note Auto-Connection

**Files:**
- Create: `packages/frontend/core/src/desktop/pages/workspace/weekly-reports/index.tsx`
- Modify: `packages/frontend/core/src/desktop/workbench-router.ts`
- Modify: `packages/frontend/core/src/components/root-app-sidebar/index.tsx`
- Modify: `packages/frontend/core/src/components/root-app-sidebar/journal-button.tsx`
- Modify: `packages/frontend/core/src/modules/journal/services/journal.ts`
- Modify: `packages/frontend/core/src/desktop/pages/workspace/journals/index.tsx`
- Test: `packages/frontend/core/src/modules/journal/__tests__/weekly-reports-aggregator.spec.ts`

**Interfaces:**
- Produces: `/weekly-reports` route and `<WeeklyReportsButton />` in `root-app-sidebar/index.tsx` directly beneath `<AppSidebarJournalButton />`.
- Produces: `getWeeklyReportOverview(weekKey, docsService)` in `journal.ts` helper that inspects the 7 days of that ISO week (`YYYY-MM-DD`), returning `{ days: Array<{ date: string, dayName: string, exists: boolean, docId?: string, title?: string, snippet?: string }>, stats: { daysWithJournal: number, totalDays: 7 } }`.
- Produces: Visual 7-day connected strip inside `WeeklyReportsPage` and `WeeklyJournalView` showing all 7 days with badges, 1-click open/create for each day's Daily Note, and an auto-extracted summary of notes and tasks from each daily note.

- [ ] **Step 1: Write unit test for `getWeeklyReportOverview`**
  Create `packages/frontend/core/src/modules/journal/__tests__/weekly-reports-aggregator.spec.ts` testing 7-day range generation and daily note existence mapping, and verify with `yarn vitest run --browser.headless packages/frontend/core/src/modules/journal/__tests__/weekly-reports-aggregator.spec.ts`.

- [ ] **Step 2: Build `WeeklyReportsPage` (`packages/frontend/core/src/desktop/pages/workspace/weekly-reports/index.tsx`), register in router & sidebar**
  - Register `/weekly-reports` in `workbench-router.ts` and add `<WeeklyReportsButton />` in `root-app-sidebar/index.tsx` right below Journals.
  - Render a clean timeline of all weeks of the year (`2026-W42`, `2026-W41`...) with search, date range, number of daily notes written, and 1-click open.
  - When opening a weekly report, render the interactive **7-Day Connected Strip**:
    - 7 visual cards (Lunes a Domingo) showing the date, weekday name, existence indicator (Verde si está escrita, Gris si falta), snippet of content, and 1-click button to open or create that day's Daily Note.
    - Button to "Insertar Resumen de la Semana" that automatically pastes links and summaries of all daily notes into the weekly report!

- [ ] **Step 3: Run Vitest and commit Task 1**
  Commit message: `feat(journal): add weekly reports hub with 7-day daily notes auto-connection`

---

### Task 2: Supercharged Calendar Suite (`/calendar`) with Day/Hourly Time-Blocking, Filters & Habit Indicators

**Files:**
- Modify: `packages/frontend/core/src/desktop/pages/workspace/calendar/index.tsx`
- Modify: `packages/frontend/core/src/desktop/pages/workspace/boards/index.tsx`

**Interfaces:**
- Produces: Supercharged `packages/frontend/core/src/desktop/pages/workspace/calendar/index.tsx` with:
  - **4 View Modes**: `📅 Mes`, `🗓️ Semana`, `🕒 Día (Time-Blocking por horas 06:00 - 23:00)`, and `📋 Agenda`.
  - **Search & Filter Bar**: Filter events/tasks by search keyword, category (*Trabajo*, *Personal*, *Estudio*, *Salud*, *Urgente*), and source (*Todos*, *Eventos*, *Tableros*, *Hábitos*, *Notas Diarias/Semanales*).
  - **Event Creation Modal**: Add events/tasks with start/end time, priority, category color, notes, and checklist items.
  - **Daily Habit Ring/Progress**: Shows a visual ring or mini progress bar of completed habits for each day.
  - **Productivity Dashboard Bar**: Displays monthly KPIs: *Total Tareas*, *Completadas*, *Tasa de Cumplimiento*, *Días con Journal*, *Hábitos activos*.

- [ ] **Step 1: Upgrade `calendar/index.tsx` with Hourly Day View, Filters, Event Modal & Habit Ring**
  Implement the 4th view mode (`🕒 Día`) with an interactive 24-hour time-blocking grid where clicking an hour slot creates an event at that time, add the category filter pill bar, and integrate daily habit indicators.

- [ ] **Step 2: Build & verify clean compilation**
  Run `yarn affine @affine/electron build` and verify code compiles without errors.

- [ ] **Step 3: Commit Task 2**
  Commit message: `feat(calendar): supercharge calendar with day time-blocking, category filters, and habit indicators`

---

### Task 3: Full Habits Tracking Suite (`/habits`) & Cross-Ecosystem Integration

**Files:**
- Create: `packages/frontend/core/src/desktop/pages/workspace/habits/index.tsx`
- Modify: `packages/frontend/core/src/desktop/workbench-router.ts`
- Modify: `packages/frontend/core/src/components/root-app-sidebar/index.tsx`
- Modify: `packages/frontend/core/src/desktop/pages/workspace/journals/index.tsx`
- Modify: `packages/frontend/core/src/desktop/pages/workspace/weekly-reports/index.tsx`
- Modify: `packages/frontend/core/src/desktop/pages/workspace/calendar/index.tsx`
- Test: `packages/frontend/core/src/desktop/pages/workspace/habits/__tests__/habits-calculator.spec.ts`

**Interfaces:**
- Produces: `/habits` workbench route and `<HabitsButton />` in `root-app-sidebar/index.tsx`.
- Produces: Full Habits Dashboard:
  - Weekly & Monthly interactive matrix (toggle checkbox or `+ / -` counter per day).
  - Habit types: Boolean (Sí/No) and Quantitative (target with numeric stepper, e.g. 2000 ml agua, 30 min lectura).
  - Racha actual (🔥 Streaks), mejor racha (🏆 Best Streak), y consistencia mensual.
  - Annual GitHub-style 365-day consistency heatmap per habit or global.
  - Categories: *Salud*, *Estudio*, *Fitness*, *Mente*, *Finanzas*, *Productividad*.
- Produces: Embedded **Habit Widget** in Daily Notes (`/journals`), Weekly Reports (`/weekly-reports`), and Calendar (`/calendar`).

- [ ] **Step 1: Write unit tests for habit streak calculation & completion rate**
  Create `packages/frontend/core/src/desktop/pages/workspace/habits/__tests__/habits-calculator.spec.ts` testing streak algorithms (`currentStreak`, `bestStreak`, `calculateSuccessRate`) and verify with `yarn vitest run --browser.headless packages/frontend/core/src/desktop/pages/workspace/habits/__tests__/habits-calculator.spec.ts`.

- [ ] **Step 2: Build `HabitsPage` (`packages/frontend/core/src/desktop/pages/workspace/habits/index.tsx`), register in router & sidebar**
  - Implement the full Habits Dashboard with Weekly Matrix, Monthly Matrix, Annual Heatmap, and Add/Edit Habit Modal (Boolean + Quantitative).
  - Register `/habits` in `workbench-router.ts` and add `<HabitsButton />` in `root-app-sidebar/index.tsx`.

- [ ] **Step 3: Embed interactive Habit Widget in Daily Notes, Weekly Reports & Calendar**
  Allow users to mark habits completed directly while writing their daily note or reviewing their weekly report.

- [ ] **Step 4: Run tests and commit Task 3**
  Commit message: `feat(habits): add full habits tracking suite, streaks, heatmap, and journal/calendar widgets`

---

### Task 4: Full Flatpak Rebuild & Empirical Verification

**Files:**
- Run: `./build-flatpak.sh --rebuild`
- Verify: Headless Vitest suite + `flatpak info app.affinite.Affinite`

- [ ] **Step 1: Rebuild and install updated Flatpak bundle**
  Run `./build-flatpak.sh --rebuild` to compile all new web assets and install `app.affinite.Affinite`.

- [ ] **Step 2: Run all unit tests**
  Run `yarn vitest run --browser.headless` across all test files.

- [ ] **Step 3: Commit and update documentation**
  Update `walkthrough.md` and `task.md`.
