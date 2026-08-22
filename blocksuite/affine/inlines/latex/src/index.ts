import type * as RichTextEffects from '@blocksuite/affine-rich-text/effects';
import type RemarkMath from 'remark-math';

export * from './adapters';
export * from './command';
export * from './inline-spec';
export * from './markdown';
export {
  DEFAULT_KATEX_OPTIONS,
  KATEX_SCIENTIFIC_MACROS,
  safeRenderKatex,
  type SafeRenderResult,
  safeRenderKatexToString,
  type SafeRenderToStringResult,
} from '@blocksuite/affine-block-latex';
export * from './latex-node/visual-palette-data';

declare type _GLOBAL_ = typeof RichTextEffects | typeof RemarkMath;

