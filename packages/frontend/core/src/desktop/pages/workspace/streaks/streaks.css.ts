import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export * from '../shared/workspace-page.css';

export const headerActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap',
});

export const streaksGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
  gap: '20px',
});

export const streakCard = style({
  borderRadius: '14px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/primary'),
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  boxShadow: cssVar('buttonShadow'),
  position: 'relative',
  overflow: 'hidden',
  transition: 'border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
  selectors: {
    '&:hover': {
      borderColor: cssVar('brandColor'),
      transform: 'translateY(-1px)',
    },
  },
});

export const topAccentStrip = style({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '4px',
});

export const cardHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  marginBottom: '12px',
});

export const cardTitleGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
});

export const cardIcon = style({
  fontSize: '24px',
  lineHeight: 1,
});

export const cardTitle = style({
  margin: 0,
  fontSize: '16px',
  fontWeight: 700,
  color: cssVarV2('text/primary'),
});

export const cardCategory = style({
  fontSize: '11px',
  color: cssVarV2('text/secondary'),
  marginTop: '2px',
  display: 'block',
});

export const modeBadge = style({
  fontSize: '11px',
  fontWeight: 600,
  padding: '3px 8px',
  borderRadius: '9999px',
  whiteSpace: 'nowrap',
});

export const cardDescription = style({
  margin: '0 0 16px',
  fontSize: '13px',
  color: cssVarV2('text/secondary'),
  lineHeight: 1.4,
});

export const countdownBox = style({
  padding: '14px 16px',
  borderRadius: '10px',
  backgroundColor: cssVarV2('layer/background/primary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  marginBottom: '16px',
});

export const countdownLabel = style({
  fontSize: '11px',
  fontWeight: 600,
  color: cssVarV2('text/secondary'),
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '4px',
});

export const countdownValue = style({
  fontSize: '22px',
  fontWeight: 800,
  fontFamily: 'monospace',
});

export const progressSection = style({
  marginBottom: '16px',
});

export const progressMeta = style({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '12px',
  fontWeight: 600,
  marginBottom: '6px',
  color: cssVarV2('text/secondary'),
});

export const cardFooter = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: '12px',
  borderTop: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  gap: '8px',
});

export const cardActionGroup = style({
  display: 'flex',
  gap: '6px',
  flexWrap: 'wrap',
});

export const smallSecondaryButton = style({
  padding: '5px 10px',
  borderRadius: '6px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/primary'),
  color: cssVarV2('text/primary'),
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease, border-color 0.15s ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
      borderColor: cssVar('brandColor'),
    },
  },
});

export const smallDangerButton = style({
  padding: '5px 10px',
  borderRadius: '6px',
  border: '1px solid rgba(239, 68, 68, 0.25)',
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  color: cssVar('errorColor'),
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  selectors: {
    '&:hover': {
      backgroundColor: 'rgba(239, 68, 68, 0.18)',
    },
  },
});

export const modeSelectorGrid = style({
  display: 'flex',
  gap: '8px',
});

export const modeOptionButton = style({
  flex: 1,
  padding: '8px 12px',
  borderRadius: '8px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/secondary'),
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      color: cssVarV2('text/primary'),
      borderColor: cssVar('brandColor'),
    },
    '&[data-active="true"]': {
      backgroundColor: cssVar('brandColor'),
      borderColor: cssVar('brandColor'),
      color: '#ffffff',
    },
  },
});

export const iconPickerGrid = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginBottom: '8px',
  flexWrap: 'wrap',
});

export const iconOptionButton = style({
  fontSize: '18px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '6px',
  padding: '6px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      borderColor: cssVar('brandColor'),
    },
    '&[data-active="true"]': {
      borderColor: cssVar('brandColor'),
      backgroundColor: cssVar('hoverColor'),
      transform: 'scale(1.06)',
    },
  },
});

export const colorPickerRow = style({
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
});

export const colorSwatchButton = style({
  width: '26px',
  height: '26px',
  borderRadius: '6px',
  border: '2px solid transparent',
  cursor: 'pointer',
  transition: 'transform 0.15s ease',
  selectors: {
    '&[data-active="true"]': {
      borderColor: cssVarV2('text/primary'),
      transform: 'scale(1.1)',
    },
  },
});

export const checkboxGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginTop: '4px',
});

export const checkboxLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '13px',
  color: cssVarV2('text/primary'),
  cursor: 'pointer',
});
