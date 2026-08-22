import {
  DocModeProvider,
  TelemetryProvider,
} from '@blocksuite/affine-shared/services';
import type { AffineTextAttributes } from '@blocksuite/affine-shared/types';
import type { BlockComponent } from '@blocksuite/std';
import { InlineMarkdownExtension } from '@blocksuite/std/inline';

export const LatexExtension = InlineMarkdownExtension<AffineTextAttributes>({
  name: 'latex',

  pattern:
    /(?<blockPrefix>\$\$\$\$)\s$|(?:\$\$)(?<doubleContent>[^$]+)(?:\$\$)\s$|(?<inlinePrefix>\$\$)\s$|(?<!\$)(?:\$)(?<singleContent>[^\s$\n](?:[^$\n]*?[^\s$\n])?)(?:\$)\s$/g,
  action: ({ inlineEditor, prefixText, inlineRange, pattern, undoManager }) => {
    const match = pattern.exec(prefixText);
    if (!match || !match.groups) return;
    const doubleContent = match.groups['doubleContent'];
    const singleContent = match.groups['singleContent'];
    const content = doubleContent ?? singleContent;
    const delimiterLen = doubleContent ? 2 : singleContent ? 1 : 0;
    const inlinePrefix = match.groups['inlinePrefix'];
    const blockPrefix = match.groups['blockPrefix'];

    if (!inlineEditor.rootElement) return;
    const blockComponent =
      inlineEditor.rootElement.closest<BlockComponent>('[data-block-id]');
    if (!blockComponent) return;

    const doc = blockComponent.store;
    const std = blockComponent.std;
    const parentComponent = blockComponent.parentComponent;
    if (!parentComponent) return;
    const index = parentComponent.model.children.indexOf(blockComponent.model);
    if (index === -1) return;
    const mode = std.get(DocModeProvider).getEditorMode() ?? 'page';
    const ifEdgelessText = blockComponent.closest('affine-edgeless-text');

    if (blockPrefix === '$$$$') {
      undoManager.stopCapturing();

      inlineEditor.deleteText({
        index: inlineRange.index - 5,
        length: 5,
      });

      const id = doc.addBlock(
        'affine:latex',
        {
          latex: '',
        },
        parentComponent.model,
        index + 1
      );
      blockComponent.host.updateComplete
        .then(() => {
          const latexBlock = blockComponent.std.view.getBlock(id);
          if (!latexBlock || latexBlock.flavour !== 'affine:latex') return;

          //FIXME(@Flrande): wait for refactor
          // @ts-expect-error BS-2241
          latexBlock.toggleEditor();
        })
        .catch(console.error);

      std.getOptional(TelemetryProvider)?.track('Latex', {
        from:
          mode === 'page'
            ? 'doc'
            : ifEdgelessText
              ? 'edgeless text'
              : 'edgeless note',
        page: mode === 'page' ? 'doc' : 'edgeless',
        segment: mode === 'page' ? 'doc' : 'whiteboard',
        module: 'equation',
        control: 'create equation',
      });

      return;
    }

    if (inlinePrefix === '$$') {
      undoManager.stopCapturing();

      inlineEditor.deleteText({
        index: inlineRange.index - 3,
        length: 3,
      });
      inlineEditor.insertText(
        {
          index: inlineRange.index - 3,
          length: 0,
        },
        ' '
      );
      inlineEditor.formatText(
        {
          index: inlineRange.index - 3,
          length: 1,
        },
        {
          latex: '',
        }
      );

      inlineEditor
        .waitForUpdate()
        .then(async () => {
          await inlineEditor.waitForUpdate();

          const textPoint = inlineEditor.getTextPoint(
            inlineRange.index - 3 + 1
          );
          if (!textPoint) return;

          const [text] = textPoint;
          const latexNode = text.parentElement?.closest('affine-latex-node');
          if (!latexNode) return;

          latexNode.toggleEditor();
        })
        .catch(console.error);

      std.getOptional(TelemetryProvider)?.track('Latex', {
        from:
          mode === 'page'
            ? 'doc'
            : ifEdgelessText
              ? 'edgeless text'
              : 'edgeless note',
        page: mode === 'page' ? 'doc' : 'edgeless',
        segment: mode === 'page' ? 'doc' : 'whiteboard',
        module: 'inline equation',
        control: 'create inline equation',
      });

      return;
    }

    if (!content || content.length === 0) return;

    undoManager.stopCapturing();

    const startIndex =
      inlineRange.index - 1 - delimiterLen - content.length - delimiterLen;
    inlineEditor.deleteText({
      index: startIndex,
      length: delimiterLen + content.length + delimiterLen + 1,
    });
    inlineEditor.insertText(
      {
        index: startIndex,
        length: 0,
      },
      ' '
    );
    inlineEditor.formatText(
      {
        index: startIndex,
        length: 1,
      },
      {
        latex: String.raw`${content}`,
      }
    );

    inlineEditor.setInlineRange({
      index: startIndex + 1,
      length: 0,
    });

    std.getOptional(TelemetryProvider)?.track('Latex', {
      from:
        mode === 'page'
          ? 'doc'
          : ifEdgelessText
            ? 'edgeless text'
            : 'edgeless note',
      page: mode === 'page' ? 'doc' : 'edgeless',
      segment: mode === 'page' ? 'doc' : 'whiteboard',
      module: 'inline equation',
      control: 'create inline equation',
    });
  },
});
