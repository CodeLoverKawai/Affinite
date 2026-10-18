import { cssVar } from '@toeverything/theme';
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
  backgroundColor: '#16a34a',
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
