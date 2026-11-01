import 'package:anx_reader/dao/base_dao.dart';
import 'package:anx_reader/models/book.dart';
import 'package:anx_reader/service/web_bridge.dart';
import 'package:anx_reader/utils/platform_utils.dart';

class BookDao extends BaseDao {
  BookDao();

  static const String table = 'tb_books';
  static List<Book> webBooks = [];

  Future<int> save(Book book) async {
    if (AnxPlatform.isWeb) {
      if (book.id == -1) {
        book.id = (webBooks.isEmpty
            ? 1
            : webBooks.map((b) => b.id).reduce((a, b) => a > b ? a : b) + 1);
        webBooks.insert(0, book);
      } else {
        final idx = webBooks.indexWhere((b) => b.id == book.id);
        if (idx != -1) {
          webBooks[idx] = book;
        } else {
          webBooks.insert(0, book);
        }
      }
      WebBridge.updateBookMeta(book);
      return book.id;
    }
    if (book.id != -1) {
      await updateBook(book);
      return book.id;
    }
    return insert(table, book.toMap());
  }

  Future<int> insertBook(Book book) => save(book);

  Future<void> updateBook(Book book) async {
    if (AnxPlatform.isWeb) {
      book.updateTime = DateTime.now();
      final idx = webBooks.indexWhere((b) => b.id == book.id);
      if (idx != -1) {
        webBooks[idx] = book;
      } else {
        webBooks.insert(0, book);
      }
      WebBridge.updateBookMeta(book);
      return;
    }
    book.updateTime = DateTime.now();
    await update(
      table,
      book.toMap(),
      where: 'id = ?',
      whereArgs: [book.id],
    );
  }

  Future<List<Book>> selectBooks({bool includeDeleted = true}) {
    if (AnxPlatform.isWeb) {
      return Future.value(
        webBooks
            .where((b) => includeDeleted ? true : !b.isDeleted)
            .toList(),
      );
    }
    return queryList(
      table,
      mapper: Book.fromDb,
      where: includeDeleted ? null : 'is_deleted = 0',
      orderBy: 'update_time DESC',
    );
  }

  Future<List<Book>> selectNotDeleteBooks() {
    return selectBooks(includeDeleted: false);
  }

  Future<Book> selectBookById(int id) async {
    if (AnxPlatform.isWeb) {
      final match = webBooks.where((b) => b.id == id);
      if (match.isNotEmpty) {
        return Future.value(match.first);
      }
      final active = webBooks.where((b) => !b.isDeleted);
      if (active.isNotEmpty) {
        return Future.value(active.first);
      }
      return Future.value(
        Book(
          id: id,
          title: 'Libro archivado',
          coverPath: '',
          filePath: '',
          lastReadPosition: '',
          readingPercentage: 0,
          author: '',
          isDeleted: true,
          rating: 0,
          groupId: 0,
          createTime: DateTime.now(),
          updateTime: DateTime.now(),
        ),
      );
    }
    final book = await querySingle(
      table,
      mapper: Book.fromDb,
      where: 'id = ?',
      whereArgs: [id],
    );

    if (book == null) {
      throw StateError('Book with id $id not found');
    }
    return book;
  }

  Future<List<String>> getCurrentBooks() async {
    final books = await selectNotDeleteBooks();
    return books.map((book) => book.filePath).toList(growable: false);
  }

  Future<List<String>> getCurrentCover() async {
    final books = await selectNotDeleteBooks();
    return books.map((book) => book.coverPath).toList(growable: false);
  }

  Future<List<Book>> selectAllBooks() {
    return selectBooks();
  }

  Future<Book?> getBookByMd5(String md5) {
    if (AnxPlatform.isWeb) {
      return Future.value(
        webBooks.cast<Book?>().firstWhere((b) => b?.md5 == md5, orElse: () => null),
      );
    }
    return querySingle(
      table,
      mapper: Book.fromDb,
      where: 'file_md5 = ?',
      whereArgs: [md5],
    );
  }

  Future<List<Book>> searchBooks(String keyword) async {
    final query = keyword.trim().toLowerCase();
    if (query.isEmpty) {
      return const [];
    }
    if (AnxPlatform.isWeb) {
      return webBooks
          .where((b) =>
              !b.isDeleted &&
              (b.title.toLowerCase().contains(query) ||
                  b.author.toLowerCase().contains(query)))
          .toList();
    }

    return queryList(
      table,
      mapper: Book.fromDb,
      where: 'is_deleted = 0 AND (title LIKE ? OR author LIKE ?)',
      whereArgs: ['%$query%', '%$query%'],
      orderBy: 'update_time DESC',
    );
  }

  Future<List<Book>> selectBooksByIds(List<int> ids) async {
    if (ids.isEmpty) {
      return const [];
    }
    if (AnxPlatform.isWeb) {
      return webBooks.where((b) => !b.isDeleted && ids.contains(b.id)).toList();
    }

    final placeholders = List.filled(ids.length, '?').join(',');
    return rawQueryList(
      'SELECT * FROM $table WHERE is_deleted = 0 AND id IN ($placeholders)',
      arguments: ids,
      mapper: Book.fromDb,
    );
  }

  Future<void> updateBookMd5(int bookId, String md5) async {
    if (AnxPlatform.isWeb) {
      final idx = webBooks.indexWhere((b) => b.id == bookId);
      if (idx != -1) {
        webBooks[idx].md5 = md5;
      }
      return;
    }
    await update(
      table,
      {
        'file_md5': md5,
        'update_time': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [bookId],
    );
  }

  Future<List<Book>> getBooksWithoutMd5() {
    if (AnxPlatform.isWeb) {
      return Future.value(const []);
    }
    return queryList(
      table,
      mapper: Book.fromDb,
      where: "is_deleted = 0 AND (file_md5 IS NULL OR file_md5 = '')",
      orderBy: 'update_time DESC',
    );
  }
}

final bookDao = BookDao();
