import {
  HastUtils,
  type HtmlAST,
  HtmlASTToDeltaExtension,
} from '@blocksuite/affine-shared/adapters';
import type { Element } from 'hast';

const isElement = (ast: HtmlAST): ast is Element => {
  return ast.type === 'element';
};

export const htmlLatexElementToDeltaMatcher = HtmlASTToDeltaExtension({
  name: 'latex-element',
  match: ast => {
    if (!isElement(ast) || ast.tagName !== 'span') {
      return false;
    }
    const className = ast.properties?.className;
    const isLatexClass =
      Array.isArray(className) && className.includes('affine-inline-latex');
    const hasDataLatex =
      ast.properties?.dataLatex !== undefined ||
      ast.properties?.['data-latex'] !== undefined;
    return isLatexClass || hasDataLatex;
  },
  toDelta: ast => {
    if (!isElement(ast)) {
      return [];
    }
    const dataLatex = (ast.properties?.dataLatex ??
      ast.properties?.['data-latex']) as string | undefined;

    let latex = dataLatex;
    if (latex === undefined) {
      const annotation = HastUtils.querySelector(ast, 'annotation');
      if (annotation) {
        latex = HastUtils.getTextContent(annotation);
      } else {
        latex = HastUtils.getTextContent(ast);
      }
    }

    return [
      {
        insert: ' ',
        attributes: {
          latex: latex ?? '',
        },
      },
    ];
  },
});
