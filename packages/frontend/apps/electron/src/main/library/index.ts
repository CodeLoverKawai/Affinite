import fs from 'node:fs';
import path from 'node:path';

import { app, dialog, type IpcMainInvokeEvent } from 'electron';

import { logger } from '../logger';

function getLibraryDir(): string {
  const dir = path.join(app.getPath('userData'), 'library', 'books');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export const libraryHandlers = {
  /**
   * Imports an e-book (EPUB, PDF, MOBI, etc.) into the local AFFiNITe user data directory,
   * encapsulating the book for 100% offline reading without WebDAV.
   */
  importBook: async (
    _e: IpcMainInvokeEvent,
    sourceFilePath?: string
  ): Promise<{
    id: string;
    title: string;
    author: string;
    filePath: string;
    format: string;
    size: number;
  } | null> => {
    try {
      let targetSource = sourceFilePath;

      if (!targetSource) {
        const result = await dialog.showOpenDialog({
          title: 'Importar Libro o Documento',
          properties: ['openFile'],
          filters: [
            {
              name: 'Libros y Documentos (EPUB, PDF, MOBI, TXT)',
              extensions: ['epub', 'pdf', 'mobi', 'azw3', 'txt'],
            },
            { name: 'Todos los archivos', extensions: ['*'] },
          ],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return null;
        }
        targetSource = result.filePaths[0];
      }

      if (!fs.existsSync(targetSource)) {
        throw new Error(`File does not exist: ${targetSource}`);
      }

      const libraryDir = getLibraryDir();
      const filename = path.basename(targetSource);
      const ext = path.extname(filename).replace('.', '').toLowerCase();
      const rawTitle = path.basename(filename, path.extname(filename));

      // Attempt to clean up "Title - Author" from filename
      let title = rawTitle;
      let author = 'Autor desconocido';
      if (rawTitle.includes(' - ')) {
        const parts = rawTitle.split(' - ');
        title = parts[0].trim();
        author = parts.slice(1).join(' - ').trim();
      }

      const destFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const destPath = path.join(libraryDir, destFilename);

      fs.copyFileSync(targetSource, destPath);
      const stat = fs.statSync(destPath);

      logger.info(`[Library] Imported book "${title}" into ${destPath} (${stat.size} bytes)`);

      return {
        id: `book-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        author,
        filePath: destPath,
        format: ext,
        size: stat.size,
      };
    } catch (err) {
      logger.error('[Library] Failed to import book', err);
      throw err;
    }
  },

  /**
   * Returns an assets:// protocol URL referencing the encapsulated book file.
   */
  getBookAssetUrl: async (
    _e: IpcMainInvokeEvent,
    filePath: string
  ): Promise<string> => {
    return `assets://local-file/${encodeURIComponent(filePath)}`;
  },

  /**
   * Deletes a local book from AFFiNITe storage.
   */
  deleteBook: async (
    _e: IpcMainInvokeEvent,
    filePath: string
  ): Promise<boolean> => {
    try {
      if (fs.existsSync(filePath)) {
        const libraryDir = path.join(app.getPath('userData'), 'library');
        // Security check: ensure path is inside library directory
        if (path.resolve(filePath).startsWith(path.resolve(libraryDir))) {
          fs.unlinkSync(filePath);
          logger.info(`[Library] Deleted book file: ${filePath}`);
          return true;
        }
      }
      return false;
    } catch (err) {
      logger.error('[Library] Failed to delete book', err);
      return false;
    }
  },

  /**
   * Lists all local books currently saved in userData/library/books.
   */
  listBooks: async (
    _e: IpcMainInvokeEvent
  ): Promise<
    Array<{
      id: string;
      title: string;
      author: string;
      filePath: string;
      format: string;
      size: number;
    }>
  > => {
    try {
      const libraryDir = getLibraryDir();
      if (!fs.existsSync(libraryDir)) return [];
      const files = fs.readdirSync(libraryDir);
      const books: Array<{
        id: string;
        title: string;
        author: string;
        filePath: string;
        format: string;
        size: number;
      }> = [];

      for (const file of files) {
        const fullPath = path.join(libraryDir, file);
        try {
          const stat = fs.statSync(fullPath);
          if (!stat.isFile()) continue;
          const ext = path.extname(file).replace('.', '').toLowerCase();
          if (!['epub', 'pdf', 'mobi', 'azw3', 'txt', 'fb2', 'md'].includes(ext)) continue;

          let cleanName = path.basename(file, path.extname(file));
          cleanName = cleanName.replace(/^\d+-/, '');
          let title = cleanName;
          let author = 'Autor desconocido';
          if (cleanName.includes(' - ')) {
            const parts = cleanName.split(' - ');
            title = parts[0].trim();
            author = parts.slice(1).join(' - ').trim();
          }

          books.push({
            id: `book-${file}`,
            title,
            author,
            filePath: fullPath,
            format: ext,
            size: stat.size,
          });
        } catch (_) {}
      }
      return books;
    } catch (err) {
      logger.error('[Library] Failed to list books', err);
      return [];
    }
  },
};
