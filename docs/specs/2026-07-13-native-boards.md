# Spec: Native Project Boards in AFFiNITe

## Goal
Provide a native, containerless, offline-first project board (Kanban) experience inside the AFFiNITe application, eliminating the dependency on external containers (like Planka / PostgreSQL).

## Architecture
- **No Extra Containers**: All board data is stored in the workspace's local SQLite database (via Yjs/BlockSuite updates) and synced natively via AFFiNITe Cloud.
- **BlockSuite Native Database**: Uses BlockSuite's built-in `database-block` configured with a `kanban-view` preset.
- **Sidebar Integration**: The sidebar "Boards" button points to a native Boards Dashboard.

## Key Features
- **Boards Dashboard**:
  - Displays a grid of all project boards in the current workspace.
  - Quick Search to filter boards by title.
  - "Create Board" button to spin up a new native Kanban board instantly.
- **Native Kanban Board**:
  - Drag-and-drop columns (To Do, In Progress, Done, etc.).
  - Cards containing rich-text, links, checklists, and sub-blocks (reusing BlockSuite's page detail capabilities).
  - Collaborative by default using AFFiNITe's native sync engine.
