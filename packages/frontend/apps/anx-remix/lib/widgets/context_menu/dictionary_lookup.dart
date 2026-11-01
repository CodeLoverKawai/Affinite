import 'package:anx_reader/l10n/generated/L10n.dart';
import 'package:anx_reader/service/dictionary/dictionary_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';

class DictionaryLookupBottomSheet extends StatefulWidget {
  final String word;
  final String? bookLanguage;

  const DictionaryLookupBottomSheet({
    super.key,
    required this.word,
    this.bookLanguage,
  });

  @override
  State<DictionaryLookupBottomSheet> createState() =>
      _DictionaryLookupBottomSheetState();
}

class _DictionaryLookupBottomSheetState
    extends State<DictionaryLookupBottomSheet> {
  late String _currentWord;
  late Future<String?> _lookupFuture;

  @override
  void initState() {
    super.initState();
    _currentWord = widget.word;
    _lookupFuture = DictionaryService().lookup(
      _currentWord,
      bookLanguage: widget.bookLanguage,
    );
  }

  void _triggerNewLookup(String word) {
    setState(() {
      _currentWord = word;
      _lookupFuture = DictionaryService().lookup(
        _currentWord,
        bookLanguage: widget.bookLanguage,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      ),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.6,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  "${L10n.of(context).dictionaryLookupTitle}: $_currentWord",
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const Divider(),
          Expanded(
            child: FutureBuilder<String?>(
              future: _lookupFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const CircularProgressIndicator(),
                        const SizedBox(height: 16),
                        Text(L10n.of(context).dictionaryLookupLoading),
                      ],
                    ),
                  );
                }

                if (snapshot.hasError) {
                  return Center(
                    child: Text(
                      L10n.of(context).dictionaryLookupError,
                      style: const TextStyle(color: Colors.red),
                    ),
                  );
                }

                final definition = snapshot.data;
                if (definition == null || definition.isEmpty) {
                  return Center(
                    child: Text(
                      L10n.of(context).dictionaryLookupNotFound(_currentWord),
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontStyle: FontStyle.italic),
                    ),
                  );
                }

                return SingleChildScrollView(
                  child: Html(
                    data: definition,
                    onLinkTap: (url, attributes, element) {
                      if (url != null) {
                        String targetWord = url;
                        if (targetWord.startsWith('entry://')) {
                          targetWord = targetWord.replaceFirst('entry://', '');
                        }
                        targetWord = Uri.decodeComponent(targetWord);
                        _triggerNewLookup(targetWord);
                      }
                    },
                    style: {
                      "body": Style(
                        margin: Margins.zero,
                        padding: HtmlPaddings.zero,
                        color: theme.colorScheme.onSurface,
                        fontSize: FontSize(16.0),
                      ),
                      "a": Style(
                        color: theme.colorScheme.primary,
                        textDecoration: TextDecoration.underline,
                      ),
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
