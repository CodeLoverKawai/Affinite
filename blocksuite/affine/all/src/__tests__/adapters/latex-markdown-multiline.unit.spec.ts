import { DefaultTheme, NoteDisplayMode } from '@blocksuite/affine-model';
import { MarkdownAdapter } from '@blocksuite/affine-shared/adapters';
import type { BlockSnapshot } from '@blocksuite/store';
import { describe, expect, it, test } from 'vitest';

import { createJob } from '../utils/create-job.js';
import { getProvider } from '../utils/get-provider.js';

const provider = getProvider();

describe('multiline latex in markdown', () => {
  it('should import multiline equation block with matrices without splitting into paragraphs', async () => {
    const md = `$$\n\\begin{pmatrix}\na & b \\\\\nc & d\n\\end{pmatrix}\n$$\n`;
    const adapter = new MarkdownAdapter(createJob(), provider);
    const snapshot = await adapter.toBlockSnapshot({ file: md });

    const latexChild = snapshot.children.find(c => c.flavour === 'affine:latex');
    expect(latexChild).toBeDefined();
    expect(latexChild?.props.latex).toBe(
      '\\begin{pmatrix}\na & b \\\\\nc & d\n\\end{pmatrix}'
    );
  });

  it('should import multiline equation block with cases environment', async () => {
    const md = `$$\n\\begin{cases}\nx^2 & x \\ge 0 \\\\\n-x & x < 0\n\\end{cases}\n$$\n`;
    const adapter = new MarkdownAdapter(createJob(), provider);
    const snapshot = await adapter.toBlockSnapshot({ file: md });

    const latexChild = snapshot.children.find(c => c.flavour === 'affine:latex');
    expect(latexChild).toBeDefined();
    expect(latexChild?.props.latex).toBe(
      '\\begin{cases}\nx^2 & x \\ge 0 \\\\\n-x & x < 0\n\\end{cases}'
    );
  });

  it('should preserve multiline equations with internal blank lines without paragraph breaks', async () => {
    const md = `$$\n\\begin{pmatrix}\na & b \\\\\n\nc & d\n\\end{pmatrix}\n$$\n`;
    const adapter = new MarkdownAdapter(createJob(), provider);
    const snapshot = await adapter.toBlockSnapshot({ file: md });

    const latexChildren = snapshot.children.filter(
      c => c.flavour === 'affine:latex'
    );
    expect(latexChildren.length).toBe(1);
    expect(latexChildren[0].props.latex).toBe(
      '\\begin{pmatrix}\na & b \\\\\nc & d\n\\end{pmatrix}'
    );
  });

  it('should convert display brackets \\[ ... \\] with multiline matrices to latex block', async () => {
    const md = `\\[\n\\begin{bmatrix}\n1 & 0 \\\\\n0 & 1\n\\end{bmatrix}\n\\]\n`;
    const adapter = new MarkdownAdapter(createJob(), provider);
    const snapshot = await adapter.toBlockSnapshot({ file: md });

    const latexChild = snapshot.children.find(c => c.flavour === 'affine:latex');
    expect(latexChild).toBeDefined();
    expect(latexChild?.props.latex).toBe(
      '\\begin{bmatrix}\n1 & 0 \\\\\n0 & 1\n\\end{bmatrix}'
    );
  });

  it('should automatically wrap standalone \\begin{...} \\end{...} environments into latex blocks', async () => {
    const md = `\\begin{aligned}\nf(x) &= (x+a)(x+b) \\\\\n     &= x^2 + (a+b)x + ab\n\\end{aligned}\n`;
    const adapter = new MarkdownAdapter(createJob(), provider);
    const snapshot = await adapter.toBlockSnapshot({ file: md });

    const latexChild = snapshot.children.find(c => c.flavour === 'affine:latex');
    expect(latexChild).toBeDefined();
    expect(latexChild?.props.latex).toBe(
      '\\begin{aligned}\nf(x) &= (x+a)(x+b) \\\\\n     &= x^2 + (a+b)x + ab\n\\end{aligned}'
    );
  });

  it('should cleanly parse mixed document with paragraphs, inline math and multiline latex blocks', async () => {
    const md = `Here is a matrix equation:

$$
\\begin{pmatrix}
\\cos\\theta & -\\sin\\theta \\\\
\\sin\\theta & \\cos\\theta
\\end{pmatrix}
$$

And a piecewise definition for $f(x)$:

\\begin{cases}
\\frac{\\sin x}{x} & x \\neq 0 \\\\
1 & x = 0
\\end{cases}
`;
    const adapter = new MarkdownAdapter(createJob(), provider);
    const snapshot = await adapter.toBlockSnapshot({ file: md });

    const flavours = snapshot.children.map(c => c.flavour);
    expect(flavours).toEqual([
      'affine:paragraph',
      'affine:latex',
      'affine:paragraph',
      'affine:latex',
    ]);

    const latexBlocks = snapshot.children.filter(
      c => c.flavour === 'affine:latex'
    );
    expect(latexBlocks[0].props.latex).toBe(
      '\\begin{pmatrix}\n\\cos\\theta & -\\sin\\theta \\\\\n\\sin\\theta & \\cos\\theta\n\\end{pmatrix}'
    );
    expect(latexBlocks[1].props.latex).toBe(
      '\\begin{cases}\n\\frac{\\sin x}{x} & x \\neq 0 \\\\\n1 & x = 0\n\\end{cases}'
    );

    // Verify paragraph with inline formula
    const para = snapshot.children[2];
    const textDelta = (para.props.text as any)?.delta;
    expect(textDelta).toEqual([
      { insert: 'And a piecewise definition for ' },
      { insert: ' ', attributes: { latex: 'f(x)' } },
      { insert: ':' },
    ]);
  });

  test('round-trip export and import for multiline latex block', async () => {
    const originalLatex =
      '\\begin{pmatrix}\n1 & 2 & 3 \\\\\n4 & 5 & 6 \\\\\n7 & 8 & 9\n\\end{pmatrix}';

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

    const adapter = new MarkdownAdapter(createJob(), provider);
    const exported = await adapter.fromBlockSnapshot({ snapshot: blockSnapshot });
    expect(exported.file).toContain('$$');
    expect(exported.file).toContain('\\begin{pmatrix}');

    const imported = await adapter.toBlockSnapshot({ file: exported.file });
    const latexChild = imported.children.find(c => c.flavour === 'affine:latex');
    expect(latexChild).toBeDefined();
    expect(latexChild?.props.latex).toBe(originalLatex);
  });
});
