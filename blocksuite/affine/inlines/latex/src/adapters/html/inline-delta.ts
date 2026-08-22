import { InlineDeltaToHtmlAdapterExtension } from '@blocksuite/affine-shared/adapters';
import type { ElementContent } from 'hast';
import { fromHtml } from 'hast-util-from-html';
import katex from 'katex';

export const latexDeltaToHtmlAdapterMatcher = InlineDeltaToHtmlAdapterExtension({
  name: 'latex',
  match: delta => !!delta.attributes?.latex,
  toAST: (delta, context) => {
    const latex = delta.attributes?.latex;
    if (!latex) {
      return context.current;
    }
    let renderedChildren: ElementContent[] = [];
    try {
      const renderedHtml = katex.renderToString(latex, {
        trust: true,
        strict: false,
        output: 'htmlAndMathml',
        displayMode: false,
        throwOnError: false,
      });
      const parsed = fromHtml(renderedHtml, { fragment: true });
      renderedChildren = parsed.children as ElementContent[];
    } catch {
      renderedChildren = [{ type: 'text', value: latex }];
    }

    return {
      type: 'element',
      tagName: 'span',
      properties: {
        className: ['affine-inline-latex'],
        dataLatex: latex,
      },
      children: renderedChildren,
    };
  },
});
