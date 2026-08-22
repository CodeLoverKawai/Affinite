import { LatexBlockSchema } from '@blocksuite/affine-model';
import {
  BlockHtmlAdapterExtension,
  type BlockHtmlAdapterMatcher,
  HastUtils,
} from '@blocksuite/affine-shared/adapters';
import { nanoid } from '@blocksuite/store';
import type { ElementContent } from 'hast';
import { fromHtml } from 'hast-util-from-html';
import katex from 'katex';

import { DEFAULT_KATEX_OPTIONS } from '../katex-config.js';

export const latexBlockHtmlAdapterMatcher: BlockHtmlAdapterMatcher = {
  flavour: LatexBlockSchema.model.flavour,
  toMatch: o => {
    if (!HastUtils.isElement(o.node) || o.node.tagName !== 'div') {
      return false;
    }
    const className = o.node.properties?.className;
    const isLatexClass =
      Array.isArray(className) &&
      (className.includes('affine-latex-block') ||
        className.includes('katex-block'));
    const hasDataLatex =
      o.node.properties?.dataLatex !== undefined ||
      o.node.properties?.['data-latex'] !== undefined;
    return isLatexClass || hasDataLatex;
  },
  fromMatch: o => o.node.flavour === LatexBlockSchema.model.flavour,
  toBlockSnapshot: {
    enter: (o, context) => {
      if (!HastUtils.isElement(o.node)) {
        return;
      }
      const { walkerContext } = context;
      const dataLatex = (o.node.properties?.dataLatex ??
        o.node.properties?.['data-latex']) as string | undefined;

      let latex = dataLatex;
      if (latex === undefined) {
        const annotation = HastUtils.querySelector(o.node, 'annotation');
        if (annotation) {
          latex = HastUtils.getTextContent(annotation);
        } else {
          latex = HastUtils.getTextContent(o.node);
        }
      }

      walkerContext
        .openNode(
          {
            type: 'block',
            id: nanoid(),
            flavour: LatexBlockSchema.model.flavour,
            props: {
              latex: latex ?? '',
            },
            children: [],
          },
          'children'
        )
        .closeNode();
      walkerContext.skipAllChildren();
    },
  },
  fromBlockSnapshot: {
    enter: (o, context) => {
      const { walkerContext } = context;
      const latex = (o.node.props.latex as string) ?? '';
      let renderedChildren: ElementContent[] = [];
      try {
        const renderedHtml = katex.renderToString(latex, {
          ...DEFAULT_KATEX_OPTIONS,
          displayMode: true,
          throwOnError: false,
        });
        const parsed = fromHtml(renderedHtml, { fragment: true });
        renderedChildren = parsed.children as ElementContent[];
      } catch {
        renderedChildren = [{ type: 'text', value: latex }];
      }

      walkerContext
        .openNode(
          {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['affine-latex-block'],
              dataLatex: latex,
            },
            children: [
              {
                type: 'element',
                tagName: 'div',
                properties: {
                  className: ['katex'],
                },
                children: renderedChildren,
              },
            ],
          },
          'children'
        )
        .closeNode();
    },
  },
};

export const LatexBlockHtmlAdapterExtension = BlockHtmlAdapterExtension(
  latexBlockHtmlAdapterMatcher
);
