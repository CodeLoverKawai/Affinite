# Weekly Reports Hub, Supercharged Calendar & Full Habits Module Design Spec

**Date:** 2026-10-17
**Branch:** `feat/linux-performance-flatpak-offline`
**Status:** Approved

---

## 1. Overview & Objectives

This specification delivers three deeply interconnected productivity systems for AFFiNITe:

1. **Dedicated Weekly Reports Hub (`/weekly-reports`)**:
   - Placed in the left sidebar directly beneath **Diarios (`Journals`)**.
   - Chronological list of all ISO weeks of the year (`2026-W42`, `2026-W41`, etc.) with quick search, completion badges, and 1-click creation.
   - **Automatic 7-Day Daily Note Integration**: Opening any Weekly Report automatically inspects the 7 days of that week (Monday to Sunday):
     - Displays cards/links for all 7 days indicating whether each Daily Note exists, with 1-click creation or instant opening.
     - Automatically aggregates todos/checklists, notes, and habits completed across the 7 daily notes into the weekly review.
2. **Supercharged Calendar & Time-Blocking Suite (`/calendar`)**:
   - **Views**: `📅 Mes (Month Grid)`, `🗓️ Semana (Week Planner)`, `🕒 Día (Hourly Time-Blocking 06:00 - 23:00)`, and `📋 Agenda / Tareas`.
   - **Rich Features**:
     - Event & task creation with start/end time, color tags (*Trabajo*, *Personal*, *Estudio*, *Salud*, *Urgente*), priority (*Alta*, *Media*, *Baja*), and checklist items.
     - Real-time search filter and category/type filters (*Tableros*, *Hábitos*, *Tareas*, *Notas Diarias/Semanales*).
     - Daily habit consistency ring/progress bar inside every calendar cell.
     - Monthly Productivity KPI cards (*Tareas completadas*, *Pendientes*, *Días con Journal escrito*, *Consistencia de hábitos*).
     - Collapsible **"📌 Tarjetas de Boards sin fecha"** side drawer with drag-and-drop or 1-click scheduling.
3. **Full Habits Tracking Suite (`/habits`)**:
   - Sidebar item `Hábitos` with habit matrix (Weekly & Monthly grid), current streak (🔥), best streak (🏆), success rate, and GitHub-style 365-day annual heatmap.
   - Supports Boolean (checkbox) and Quantitative (numeric counter with target, e.g. 2000 ml, 30 min, 10 pages) habits with daily or specific-day frequencies.
   - Interactive Habit Widget embedded in **Notas Diarias (`/journals`)**, in **Weekly Reports (`/weekly-reports`)**, and on the **Calendar (`/calendar`)**.
   - 100% Local-First persistence in workspace Yjs CRDT (`affinite_habits_v1` and `affinite_calendar_v1`) synced with SQLite via `nbstore`.
