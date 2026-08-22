import {
  type MarkdownAdapterPreprocessor,
  MarkdownPreprocessorExtension,
} from '@blocksuite/affine-shared/adapters';

function escapeMhchem(text: string) {
  return text.replaceAll('$\\ce{', '$\\\\ce{').replaceAll('$\\pu{', '$\\\\pu{');
}

/**
 * Preprocess the content to protect code blocks and cleanly preserve multiline LaTeX expressions
 * (matrices, cases, aligned environments, display math with $$ ... $$, \[ ... \], \begin{...} ... \end{...})
 * so Remark doesn't split them across blank lines into separate malformed paragraphs.
 *
 * @param content - The content to preprocess
 * @returns The preprocessed content
 */
function preprocessLatex(content: string) {
  // 1. Protect code blocks (fenced ```...``` or ~~~...~~~ and inline `...`)
  const codeBlocks: string[] = [];
  let preprocessedContent = content.replace(
    /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g,
    code => {
      codeBlocks.push(code);
      return `<<CODE_BLOCK_${codeBlocks.length - 1}>>`;
    }
  );

  // 2. Convert standard bracket notation: \[ ... \] to display math $$ ... $$ and \( ... \) to inline math $ ... $
  preprocessedContent = preprocessedContent.replace(
    /\\\[([\s\S]*?)\\\]/g,
    (_, math) => {
      const trimmed = math.trim();
      return `\n\n$$\n${trimmed}\n$$\n\n`;
    }
  );

  preprocessedContent = preprocessedContent.replace(
    /\\\(([\s\S]*?)\\\)/g,
    (_, math) => {
      const trimmed = math.trim();
      return `$${trimmed}$`;
    }
  );

  // 3. Normalize and protect display math blocks ($$ ... $$)
  const displayMathBlocks: string[] = [];
  preprocessedContent = preprocessedContent.replace(
    /\$\$([\s\S]*?)\$\$/g,
    (_, math) => {
      // Normalize internal blank lines within display math so Remark doesn't break into paragraphs
      const cleanMath = math.trim().replace(/\n\s*\n+/g, '\n');
      displayMathBlocks.push(`\n\n$$\n${cleanMath}\n$$\n\n`);
      return `<<LATEX_BLOCK_${displayMathBlocks.length - 1}>>`;
    }
  );

  // 4. Protect existing inline math $...$
  const inlineMathBlocks: string[] = [];
  preprocessedContent = preprocessedContent.replace(
    /(?<!\$)\$(?!\$)([^\s$\n](?:[^$\n]*?[^\s$\n])?)\$(?!\$)/g,
    math => {
      inlineMathBlocks.push(math);
      return `<<LATEX_INLINE_${inlineMathBlocks.length - 1}>>`;
    }
  );

  // 5. Detect standalone LaTeX environments (\begin{env} ... \end{env}) not wrapped in $$
  const envRegex = /\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\1\}/g;
  preprocessedContent = preprocessedContent.replace(envRegex, match => {
    const cleanEnv = match.trim().replace(/\n\s*\n+/g, '\n');
    displayMathBlocks.push(`\n\n$$\n${cleanEnv}\n$$\n\n`);
    return `<<LATEX_BLOCK_${displayMathBlocks.length - 1}>>`;
  });

  // 6. Escape dollar signs that are likely currency indicators (e.g. $9.15)
  preprocessedContent = preprocessedContent.replace(/\$(?=\d)/g, '\\$');

  // 7. Restore inline math
  preprocessedContent = preprocessedContent.replace(
    /<<LATEX_INLINE_(\d+)>>/g,
    (_, index) => inlineMathBlocks[parseInt(index)]
  );

  // 8. Restore display math blocks
  preprocessedContent = preprocessedContent.replace(
    /<<LATEX_BLOCK_(\d+)>>/g,
    (_, index) => displayMathBlocks[parseInt(index)]
  );

  // 9. Restore code blocks
  preprocessedContent = preprocessedContent.replace(
    /<<CODE_BLOCK_(\d+)>>/g,
    (_, index) => codeBlocks[parseInt(index)]
  );

  // 10. Apply chemistry escaping
  preprocessedContent = escapeMhchem(preprocessedContent);

  return preprocessedContent;
}

const latexPreprocessor: MarkdownAdapterPreprocessor = {
  name: 'latex',
  levels: ['block', 'slice', 'doc'],
  preprocess: content => {
    return preprocessLatex(content);
  },
};

export const LatexMarkdownPreprocessorExtension =
  MarkdownPreprocessorExtension(latexPreprocessor);
