import type { Workspace } from '@affine/core/modules/workspace';

/**
 * Pre-warmer utility for mobile workspaces.
 * Preloads all workspace subdocuments into memory in the background
 * to eliminate on-demand fetch delays when navigating pages, boards, or notes.
 */
export const prewarmWorkspaceDocs = (workspace: Workspace) => {
  if (!workspace) return;

  const docCollection = workspace.docCollection;
  if (!docCollection) return;

  // Use requestIdleCallback or fallback to setTimeout
  const scheduleIdleTask =
    typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 3000 })
      : (cb: () => void) => setTimeout(cb, 100);

  scheduleIdleTask(() => {
    try {
      const docsMap = docCollection.docs;
      const docIds = Array.from(docsMap.keys());

      // Pre-warm docs in small non-blocking chunks
      let index = 0;
      const chunkSize = 5;

      const processChunk = () => {
        const end = Math.min(index + chunkSize, docIds.length);
        for (let i = index; i < end; i++) {
          const id = docIds[i];
          // Skip root workspace doc (already loaded)
          if (id === workspace.id) continue;

          const doc = docsMap.get(id);
          if (doc && !doc.loaded) {
            try {
              // Load Yjs document binary into memory
              doc.load();
            } catch (err) {
              console.warn(`[WorkspacePrewarmer] Failed to pre-warm doc ${id}:`, err);
            }
          }
        }

        index = end;
        if (index < docIds.length) {
          scheduleIdleTask(processChunk);
        }
      };

      processChunk();
    } catch (err) {
      console.warn('[WorkspacePrewarmer] Pre-warm error:', err);
    }
  });
};
