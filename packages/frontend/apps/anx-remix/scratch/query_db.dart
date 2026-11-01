import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() async {
  sqfliteFfiInit();
  final dbFactory = databaseFactoryFfi;
  final dbPath = '/home/rousseau/.local/share/com.anxcye.anx_reader/databases/app_database.db';
  
  print('Opening database at $dbPath...');
  try {
    final db = await dbFactory.openDatabase(dbPath);
    
    final version = await db.getVersion();
    print('Database Version: $version');
    
    final List<Map<String, dynamic>> tables = await db.rawQuery(
      "SELECT name FROM sqlite_master WHERE type='table';"
    );
    print('Tables: ${tables.map((t) => t['name']).toList()}');
    
    try {
      final List<Map<String, dynamic>> dicts = await db.query('tb_dictionaries');
      print('Dictionaries count: ${dicts.length}');
      for (final dict in dicts) {
        print('Dictionary: $dict');
      }
    } catch (e) {
      print('Error querying tb_dictionaries: $e');
    }
  } catch (e) {
    print('Error opening database: $e');
  }
}
