import { DefaultTheme, NoteDisplayMode } from '@blocksuite/affine-model';
import { HtmlAdapter } from '@blocksuite/affine-shared/adapters';
import type { BlockSnapshot } from '@blocksuite/store';
import { describe, expect, test } from 'vitest';

import { createJob } from '../utils/create-job.js';
import { getProvider } from '../utils/get-provider.js';
import { nanoidReplacement } from '../utils/nanoid-replacement.js';

const provider = getProvider();

const template = (html: string, title?: string) => {
  let htmlTemplate = `
<!doctype html>
<html>
<head>
  <style>
    input[type='checkbox'] {
      display: none;
    }
    label:before {
      background: rgb(30, 150, 235);
      border-radius: 3px;
      height: 16px;
      width: 16px;
      display: inline-block;
      cursor: pointer;
    }
    input[type='checkbox'] + label:before {
      content: '';
      background: rgb(30, 150, 235);
      color: #fff;
      font-size: 16px;
      line-height: 16px;
      text-align: center;
    }
    input[type='checkbox']:checked + label:before {
      content: '✓';
    }
  </style>
</head>
<body>
<div style="width: 70vw; margin: 60px auto;"><!--BlockSuiteDocTitlePlaceholder-->
<!--HtmlTemplate-->
</div>
</body>
</html>
`
    .replace(/\s\s+|\n/g, '')
    .replace('<!--HtmlTemplate-->', html);
  if (title) {
    htmlTemplate = htmlTemplate.replace(
      '<!--BlockSuiteDocTitlePlaceholder-->',
      `<h1>${title}</h1>`
    );
  }
  return htmlTemplate;
};

describe('Latex Block and Inline HTML Adapters', () => {
  test('convert latex block snapshot to HTML', async () => {
    const blockSnapshot: BlockSnapshot = {
      type: 'block',
      id: 'block:page1',
      flavour: 'affine:page',
      props: {
        title: {
          '$blocksuite:internal:text$': true,
          delta: [],
        },
      },
      children: [
        {
          type: 'block',
          id: 'block:surface1',
          flavour: 'affine:surface',
          props: {
            elements: {},
          },
          children: [],
        },
        {
          type: 'block',
          id: 'block:note1',
          flavour: 'affine:note',
          props: {
            xywh: '[0,0,800,95]',
            background: DefaultTheme.noteBackgrounColor,
            index: 'a0',
            hidden: false,
            displayMode: NoteDisplayMode.DocAndEdgeless,
          },
          children: [
            {
              type: 'block',
              id: 'block:latex1',
              flavour: 'affine:latex',
              props: {
                latex: 'E = mc^2',
              },
              children: [],
            },
          ],
        },
      ],
    };

    const htmlAdapter = new HtmlAdapter(createJob(), provider);
    const target = await htmlAdapter.fromBlockSnapshot({
      snapshot: blockSnapshot,
    });

    expect(target.file).toContain('class="affine-latex-block"');
    expect(target.file).toContain('data-latex="E = mc^2"');
    expect(target.file).toContain('class="katex"');
    expect(target.file).toContain('E = mc^2');
  });

  test('convert HTML with affine-latex-block to block snapshot', async () => {
    const html = template(
      `<div class="affine-latex-block" data-latex="E = mc^2"><div class="katex">rendered</div></div>`
    );

    const blockSnapshot: BlockSnapshot = {
      type: 'block',
      id: 'matchesReplaceMap[0]',
      flavour: 'affine:note',
      props: {
        xywh: '[0,0,800,95]',
        background: DefaultTheme.noteBackgrounColor,
        index: 'a0',
        hidden: false,
        displayMode: NoteDisplayMode.DocAndEdgeless,
      },
      children: [
        {
          type: 'block',
          id: 'matchesReplaceMap[1]',
          flavour: 'affine:latex',
          props: {
            latex: 'E = mc^2',
          },
          children: [],
        },
      ],
    };

    const htmlAdapter = new HtmlAdapter(createJob(), provider);
    const rawBlockSnapshot = await htmlAdapter.toBlockSnapshot({
      file: html,
    });
    expect(nanoidReplacement(rawBlockSnapshot)).toEqual(blockSnapshot);
  });

  test('convert HTML with katex-block to block snapshot', async () => {
    const html = template(
      `<div class="katex-block" data-latex="\\int_0^1 x dx"><div class="katex">rendered</div></div>`
    );

    const blockSnapshot: BlockSnapshot = {
      type: 'block',
      id: 'matchesReplaceMap[0]',
      flavour: 'affine:note',
      props: {
        xywh: '[0,0,800,95]',
        background: DefaultTheme.noteBackgrounColor,
        index: 'a0',
        hidden: false,
        displayMode: NoteDisplayMode.DocAndEdgeless,
      },
      children: [
        {
          type: 'block',
          id: 'matchesReplaceMap[1]',
          flavour: 'affine:latex',
          props: {
            latex: '\\int_0^1 x dx',
          },
          children: [],
        },
      ],
    };

    const htmlAdapter = new HtmlAdapter(createJob(), provider);
    const rawBlockSnapshot = await htmlAdapter.toBlockSnapshot({
      file: html,
    });
    expect(nanoidReplacement(rawBlockSnapshot)).toEqual(blockSnapshot);
  });

  test('convert HTML with data-latex div to block snapshot', async () => {
    const html = template(
      `<div data-latex="a^2 + b^2 = c^2"><div class="katex">rendered</div></div>`
    );

    const blockSnapshot: BlockSnapshot = {
      type: 'block',
      id: 'matchesReplaceMap[0]',
      flavour: 'affine:note',
      props: {
        xywh: '[0,0,800,95]',
        background: DefaultTheme.noteBackgrounColor,
        index: 'a0',
        hidden: false,
        displayMode: NoteDisplayMode.DocAndEdgeless,
      },
      children: [
        {
          type: 'block',
          id: 'matchesReplaceMap[1]',
          flavour: 'affine:latex',
          props: {
            latex: 'a^2 + b^2 = c^2',
          },
          children: [],
        },
      ],
    };

    const htmlAdapter = new HtmlAdapter(createJob(), provider);
    const rawBlockSnapshot = await htmlAdapter.toBlockSnapshot({
      file: html,
    });
    expect(nanoidReplacement(rawBlockSnapshot)).toEqual(blockSnapshot);
  });

  test('convert HTML with MathML annotation fallback to block snapshot', async () => {
    const html = template(
      `<div class="affine-latex-block"><div class="katex"><annotation encoding="application/x-tex">\\sum_{n=1}^\\infty \\frac{1}{n^2}</annotation></div></div>`
    );

    const blockSnapshot: BlockSnapshot = {
      type: 'block',
      id: 'matchesReplaceMap[0]',
      flavour: 'affine:note',
      props: {
        xywh: '[0,0,800,95]',
        background: DefaultTheme.noteBackgrounColor,
        index: 'a0',
        hidden: false,
        displayMode: NoteDisplayMode.DocAndEdgeless,
      },
      children: [
        {
          type: 'block',
          id: 'matchesReplaceMap[1]',
          flavour: 'affine:latex',
          props: {
            latex: '\\sum_{n=1}^\\infty \\frac{1}{n^2}',
          },
          children: [],
        },
      ],
    };

    const htmlAdapter = new HtmlAdapter(createJob(), provider);
    const rawBlockSnapshot = await htmlAdapter.toBlockSnapshot({
      file: html,
    });
    expect(nanoidReplacement(rawBlockSnapshot)).toEqual(blockSnapshot);
  });

  test('convert inline latex delta to HTML', async () => {
    const blockSnapshot: BlockSnapshot = {
      type: 'block',
      id: 'block:page1',
      flavour: 'affine:page',
      props: {
        title: {
          '$blocksuite:internal:text$': true,
          delta: [],
        },
      },
      children: [
        {
          type: 'block',
          id: 'block:surface1',
          flavour: 'affine:surface',
          props: {
            elements: {},
          },
          children: [],
        },
        {
          type: 'block',
          id: 'block:note1',
          flavour: 'affine:note',
          props: {
            xywh: '[0,0,800,95]',
            background: DefaultTheme.noteBackgrounColor,
            index: 'a0',
            hidden: false,
            displayMode: NoteDisplayMode.DocAndEdgeless,
          },
          children: [
            {
              type: 'block',
              id: 'block:para1',
              flavour: 'affine:paragraph',
              props: {
                type: 'text',
                text: {
                  '$blocksuite:internal:text$': true,
                  delta: [
                    {
                      insert: 'Mass-energy relation is ',
                    },
                    {
                      insert: ' ',
                      attributes: {
                        latex: 'E = mc^2',
                      },
                    },
                    {
                      insert: ' in physics.',
                    },
                  ],
                },
              },
              children: [],
            },
          ],
        },
      ],
    };

    const htmlAdapter = new HtmlAdapter(createJob(), provider);
    const target = await htmlAdapter.fromBlockSnapshot({
      snapshot: blockSnapshot,
    });

    expect(target.file).toContain('class="affine-inline-latex"');
    expect(target.file).toContain('data-latex="E = mc^2"');
    expect(target.file).toContain('Mass-energy relation is');
    expect(target.file).toContain('in physics.');
  });

  test('convert HTML with inline latex to block snapshot', async () => {
    const html = template(
      `<p>Mass-energy relation is <span class="affine-inline-latex" data-latex="E = mc^2"><span class="katex">E=mc^2</span></span> in physics.</p>`
    );

    const blockSnapshot: BlockSnapshot = {
      type: 'block',
      id: 'matchesReplaceMap[0]',
      flavour: 'affine:note',
      props: {
        xywh: '[0,0,800,95]',
        background: DefaultTheme.noteBackgrounColor,
        index: 'a0',
        hidden: false,
        displayMode: NoteDisplayMode.DocAndEdgeless,
      },
      children: [
        {
          type: 'block',
          id: 'matchesReplaceMap[1]',
          flavour: 'affine:paragraph',
          props: {
            type: 'text',
            text: {
              '$blocksuite:internal:text$': true,
              delta: [
                {
                  insert: 'Mass-energy relation is ',
                },
                {
                  insert: ' ',
                  attributes: {
                    latex: 'E = mc^2',
                  },
                },
                {
                  insert: ' in physics.',
                },
              ],
            },
          },
          children: [],
        },
      ],
    };

    const htmlAdapter = new HtmlAdapter(createJob(), provider);
    const rawBlockSnapshot = await htmlAdapter.toBlockSnapshot({
      file: html,
    });
    expect(nanoidReplacement(rawBlockSnapshot)).toEqual(blockSnapshot);
  });

  test('convert HTML with span data-latex to block snapshot', async () => {
    const html = template(
      `<p>Energy formula: <span data-latex="E = mc^2">math</span></p>`
    );

    const blockSnapshot: BlockSnapshot = {
      type: 'block',
      id: 'matchesReplaceMap[0]',
      flavour: 'affine:note',
      props: {
        xywh: '[0,0,800,95]',
        background: DefaultTheme.noteBackgrounColor,
        index: 'a0',
        hidden: false,
        displayMode: NoteDisplayMode.DocAndEdgeless,
      },
      children: [
        {
          type: 'block',
          id: 'matchesReplaceMap[1]',
          flavour: 'affine:paragraph',
          props: {
            type: 'text',
            text: {
              '$blocksuite:internal:text$': true,
              delta: [
                {
                  insert: 'Energy formula: ',
                },
                {
                  insert: ' ',
                  attributes: {
                    latex: 'E = mc^2',
                  },
                },
              ],
            },
          },
          children: [],
        },
      ],
    };

    const htmlAdapter = new HtmlAdapter(createJob(), provider);
    const rawBlockSnapshot = await htmlAdapter.toBlockSnapshot({
      file: html,
    });
    expect(nanoidReplacement(rawBlockSnapshot)).toEqual(blockSnapshot);
  });

  test('round-trip fidelity for latex block', async () => {
    const originalLatex = '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
    const blockSnapshot: BlockSnapshot = {
      type: 'block',
      id: 'block:page1',
      flavour: 'affine:page',
      props: {
        title: {
          '$blocksuite:internal:text$': true,
          delta: [],
        },
      },
      children: [
        {
          type: 'block',
          id: 'block:surface1',
          flavour: 'affine:surface',
          props: {
            elements: {},
          },
          children: [],
        },
        {
          type: 'block',
          id: 'block:note1',
          flavour: 'affine:note',
          props: {
            xywh: '[0,0,800,95]',
            background: DefaultTheme.noteBackgrounColor,
            index: 'a0',
            hidden: false,
            displayMode: NoteDisplayMode.DocAndEdgeless,
          },
          children: [
            {
              type: 'block',
              id: 'block:latex1',
              flavour: 'affine:latex',
              props: {
                latex: originalLatex,
              },
              children: [],
            },
          ],
        },
      ],
    };

    const htmlAdapter = new HtmlAdapter(createJob(), provider);
    const exportedHtml = await htmlAdapter.fromBlockSnapshot({
      snapshot: blockSnapshot,
    });

    const importedSnapshot = await htmlAdapter.toBlockSnapshot({
      file: exportedHtml.file,
    });

    const noteChild = importedSnapshot?.children[0];
    expect(noteChild?.flavour).toBe('affine:latex');
    expect(noteChild?.props.latex).toBe(originalLatex);
  });

  test('round-trip fidelity for inline latex', async () => {
    const originalLatex = 'e^{i\\pi} + 1 = 0';
    const blockSnapshot: BlockSnapshot = {
      type: 'block',
      id: 'block:page1',
      flavour: 'affine:page',
      props: {
        title: {
          '$blocksuite:internal:text$': true,
          delta: [],
        },
      },
      children: [
        {
          type: 'block',
          id: 'block:surface1',
          flavour: 'affine:surface',
          props: {
            elements: {},
          },
          children: [],
        },
        {
          type: 'block',
          id: 'block:note1',
          flavour: 'affine:note',
          props: {
            xywh: '[0,0,800,95]',
            background: DefaultTheme.noteBackgrounColor,
            index: 'a0',
            hidden: false,
            displayMode: NoteDisplayMode.DocAndEdgeless,
          },
          children: [
            {
              type: 'block',
              id: 'block:para1',
              flavour: 'affine:paragraph',
              props: {
                type: 'text',
                text: {
                  '$blocksuite:internal:text$': true,
                  delta: [
                    {
                      insert: "Euler's identity: ",
                    },
                    {
                      insert: ' ',
                      attributes: {
                        latex: originalLatex,
                      },
                    },
                  ],
                },
              },
              children: [],
            },
          ],
        },
      ],
    };

    const htmlAdapter = new HtmlAdapter(createJob(), provider);
    const exportedHtml = await htmlAdapter.fromBlockSnapshot({
      snapshot: blockSnapshot,
    });

    const importedSnapshot = await htmlAdapter.toBlockSnapshot({
      file: exportedHtml.file,
    });

    const paraChild = importedSnapshot?.children[0];
    expect(paraChild?.flavour).toBe('affine:paragraph');
    const textDelta = (paraChild?.props.text as any)?.delta;
    expect(textDelta).toEqual([
      {
        insert: "Euler's identity: ",
      },
      {
        insert: ' ',
        attributes: {
          latex: originalLatex,
        },
      },
    ]);
  });
});
