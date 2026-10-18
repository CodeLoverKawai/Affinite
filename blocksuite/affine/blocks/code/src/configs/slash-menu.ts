import { CodeBlockIcon } from '@blocksuite/affine-components/icons';
import {
  type CodeBlockModel,
  CodeBlockSchema,
} from '@blocksuite/affine-model';
import { focusTextModel } from '@blocksuite/affine-rich-text';
import { type SlashMenuConfig } from '@blocksuite/affine-widget-slash-menu';
import { Text } from '@blocksuite/store';

export const DEFAULT_MERMAID_DIAGRAM_CODE = [
  'flowchart TD',
  '  A["Inicio"] --> B{"¿Condición?"}',
  '  B -- "Sí" --> C["Proceso OK"]',
  '  B -- "No" --> D["Revisar"]',
  '  C --> E["Fin"]',
].join('\n');

export const codeSlashMenuConfig: SlashMenuConfig = {
  disableWhen: ({ model }) => {
    return model.flavour === 'affine:code';
  },
  items: [
    {
      name: 'Mermaid Diagram',
      description: 'Create flowcharts, sequence, UML, ER, and state diagrams.',
      icon: CodeBlockIcon,
      searchAlias: [
        'mermaid',
        'diagram',
        'diagrama',
        'flowchart',
        'graph',
        'uml',
        'sequence',
        'mindmap',
      ],
      group: '4_Content & Media@25',
      when: ({ model }) =>
        model.store.schema.flavourSchemaMap.has('affine:code'),
      action: ({ std, model }) => {
        const { store } = std;
        const parent = store.getParent(model);
        if (!parent) return;
        const index = parent.children.indexOf(model);
        if (index === -1) return;

        const existingText = model.text?.toString().trim();
        const initialCode = existingText || DEFAULT_MERMAID_DIAGRAM_CODE;

        store.captureSync();
        const codeId = store.addBlock<CodeBlockModel>(
          CodeBlockSchema.model.flavour,
          {
            language: 'mermaid',
            preview: true,
            text: new Text(initialCode),
          },
          parent,
          index + 1
        );

        if (!existingText && model.text?.length === 0) {
          store.deleteBlock(model);
        }

        focusTextModel(std, codeId);
      },
    },
  ],
};

