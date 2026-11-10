import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const rescueContainer = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  width: '100%',
  padding: '32px 20px',
  boxSizing: 'border-box',
});

export const rescueCard = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  maxWidth: '480px',
  width: '100%',
  padding: '36px 28px',
  borderRadius: '16px',
  backgroundColor: cssVarV2('layer/background/primary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
  gap: '16px',
});

export const rescueIcon = style({
  fontSize: '48px',
  lineHeight: '1',
  marginBottom: '4px',
});

export const rescueTitle = style({
  fontSize: '20px',
  fontWeight: 700,
  color: cssVarV2('text/primary'),
  margin: 0,
});

export const rescueDesc = style({
  fontSize: '14px',
  color: cssVarV2('text/secondary'),
  lineHeight: 1.6,
  margin: 0,
});

export const rescueUrlBox = style({
  display: 'inline-block',
  padding: '6px 12px',
  borderRadius: '8px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  fontFamily: 'monospace',
  fontSize: '13px',
  color: cssVarV2('text/primary'),
  wordBreak: 'break-all',
  margin: '4px 0',
});

export const rescueBtnRow = style({
  display: 'flex',
  gap: '12px',
  justifyContent: 'center',
  flexWrap: 'wrap',
  marginTop: '8px',
  width: '100%',
});
