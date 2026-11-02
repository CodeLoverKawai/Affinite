import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const chatRoot = style({
  width: '100%',
  height: '100%',
});

export const chatHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  gap: '12px',
});

export const localModelBar = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '3px 10px',
  borderRadius: '999px',
  backgroundColor: cssVar('backgroundSecondaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  fontSize: '12px',
  color: cssVar('textPrimaryColor'),
});

export const zeroKeyDot = style({
  width: '7px',
  height: '7px',
  borderRadius: '50%',
  backgroundColor: cssVarV2('status/success'),
  flexShrink: 0,
});

export const headerSelect = style({
  backgroundColor: 'transparent',
  border: 'none',
  color: cssVar('textPrimaryColor'),
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  outline: 'none',
});

export const headerSeparator = style({
  opacity: 0.4,
  color: cssVar('textSecondaryColor'),
  userSelect: 'none',
});

export const headerActionBtn = style({
  padding: '2px 8px',
  borderRadius: '6px',
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
  color: cssVar('textSecondaryColor'),
  fontSize: '11px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      borderColor: cssVar('brandColor'),
      color: cssVar('textPrimaryColor'),
      backgroundColor: cssVarV2('layer/background/hoverOverlay'),
    },
  },
});

export const quickPromptBar = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '6px',
});

export const quickPromptChip = style({
  padding: '3px 10px',
  borderRadius: '999px',
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundSecondaryColor'),
  color: cssVar('textSecondaryColor'),
  fontSize: '11px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      borderColor: cssVar('brandColor'),
      color: cssVar('brandColor'),
    },
  },
});
