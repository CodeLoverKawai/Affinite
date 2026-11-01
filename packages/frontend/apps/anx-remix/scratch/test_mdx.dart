import 'package:dict_reader/dict_reader.dart';
import 'package:html/parser.dart' as html_parser;

void main() async {
  final path = '/home/rousseau/Downloads/Oxford English Dictionary.mdx';
  try {
    final reader = DictReader(path);
    await reader.initDict();
    
    final offsetInfo = await reader.locate('hello');
    if (offsetInfo != null) {
      final result = await reader.readOneMdx(offsetInfo);
      print('=== Raw HTML ===');
      print(result);
      
      final document = html_parser.parse(result);
      print('\n=== Parsed Plain Text ===');
      print(document.body?.text ?? 'NO TEXT EXTRACTED');
    }
  } catch (e) {
    print('Error: $e');
  }
}
