import {
  type StoreExtensionContext,
  StoreExtensionProvider,
} from '@blocksuite/affine-ext-loader';

import {
  htmlLatexElementToDeltaMatcher,
  latexDeltaMarkdownAdapterMatch,
  latexDeltaToHtmlAdapterMatcher,
  latexDeltaToMarkdownAdapterMatcher,
  markdownInlineMathToDeltaMatcher,
} from './adapters/index.js';

export class LatexStoreExtension extends StoreExtensionProvider {
  override name = 'affine-latex-inline';

  override setup(context: StoreExtensionContext) {
    super.setup(context);
    context.register(latexDeltaMarkdownAdapterMatch);
    context.register(latexDeltaToMarkdownAdapterMatcher);
    context.register(markdownInlineMathToDeltaMatcher);
    context.register(latexDeltaToHtmlAdapterMatcher);
    context.register(htmlLatexElementToDeltaMatcher);
  }
}
