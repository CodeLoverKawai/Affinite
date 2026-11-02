import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const pageBody = style({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  backgroundColor: cssVarV2('layer/background/primary'),
  color: cssVarV2('text/primary'),
});

export const pageContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  width: '100%',
  maxWidth: '1400px',
  margin: '0 auto',
  padding: '24px 32px 48px',
  boxSizing: 'border-box',
});

export const headerToolbar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  gap: '12px',
  paddingRight: '12px',
});

export const heroHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '16px',
  padding: '20px 24px',
  borderRadius: '14px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const heroTitleGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
});

export const heroTitle = style({
  fontSize: '22px',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: cssVarV2('text/primary'),
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
});

export const heroSubtitle = style({
  fontSize: '13px',
  color: cssVarV2('text/secondary'),
  margin: 0,
});

export const statsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '14px',
});

export const statCard = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: '16px 20px',
  borderRadius: '12px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
  selectors: {
    '&:hover': {
      borderColor: cssVar('brandColor'),
      transform: 'translateY(-1px)',
      boxShadow: cssVar('buttonShadow'),
    },
  },
});

export const statLabel = style({
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: cssVarV2('text/secondary'),
});

export const statValue = style({
  fontSize: '26px',
  fontWeight: 700,
  color: cssVarV2('text/primary'),
  lineHeight: 1.2,
});

export const statSubtext = style({
  fontSize: '12px',
  color: cssVarV2('text/secondary'),
});

export const surfaceCard = style({
  display: 'flex',
  flexDirection: 'column',
  borderRadius: '12px',
  padding: '18px 20px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  color: cssVarV2('text/primary'),
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
  selectors: {
    '&:hover': {
      borderColor: cssVar('borderColor'),
      boxShadow: cssVar('buttonShadow'),
    },
  },
});

export const interactiveSurfaceCard = style([
  surfaceCard,
  {
    cursor: 'pointer',
    selectors: {
      '&:hover': {
        borderColor: cssVar('brandColor'),
        transform: 'translateY(-2px)',
        boxShadow: cssVar('buttonShadow'),
      },
    },
  },
]);

export const elevatedPanel = style({
  borderRadius: '12px',
  padding: '16px',
  backgroundColor: cssVarV2('layer/background/overlayPanel'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  boxShadow: cssVar('popoverShadow'),
  color: cssVarV2('text/primary'),
});

export const segmentedControl = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px',
  borderRadius: '8px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const segmentButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '5px 12px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: 'transparent',
  color: cssVarV2('text/secondary'),
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      color: cssVarV2('text/primary'),
      backgroundColor: cssVar('hoverColor'),
    },
    '&[data-active="true"]': {
      backgroundColor: cssVarV2('layer/background/primary'),
      color: cssVarV2('text/primary'),
      fontWeight: 600,
      boxShadow: cssVar('buttonShadow'),
    },
  },
});

export const filterBar = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '8px',
});

export const filterPill = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 14px',
  borderRadius: '999px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/secondary'),
  fontSize: '12px',
  fontWeight: 500,
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
      fontWeight: 600,
    },
  },
});

export const primaryActionButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '8px 16px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: cssVar('brandColor'),
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'opacity 0.15s ease, transform 0.1s ease',
  selectors: {
    '&:hover': {
      opacity: 0.92,
    },
    '&:active': {
      transform: 'scale(0.98)',
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
});

export const secondaryActionButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '7px 14px',
  borderRadius: '8px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/primary'),
  fontSize: '13px',
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

export const dangerActionButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '7px 14px',
  borderRadius: '8px',
  border: `1px solid ${cssVar('errorColor')}`,
  backgroundColor: 'transparent',
  color: cssVar('errorColor'),
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  selectors: {
    '&:hover': {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
  },
});

export const badge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 600,
  backgroundColor: cssVar('hoverColor'),
  color: cssVarV2('text/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  gap: '12px',
  padding: '48px 24px',
  borderRadius: '14px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px dashed ${cssVarV2('layer/insideBorder/border')}`,
  color: cssVarV2('text/secondary'),
});

export const modalForm = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '8px 4px',
  color: cssVarV2('text/primary'),
});

export const modalHeaderTitle = style({
  fontSize: '18px',
  fontWeight: 700,
  color: cssVarV2('text/primary'),
  margin: 0,
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
});

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '12px',
});

export const formLabel = style({
  fontSize: '12px',
  fontWeight: 600,
  color: cssVarV2('text/secondary'),
});

export const formInput = style({
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/primary'),
  color: cssVarV2('text/primary'),
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease',
  selectors: {
    '&:focus': {
      borderColor: cssVar('brandColor'),
    },
  },
});

export const formTextarea = style([
  formInput,
  {
    minHeight: '80px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
]);

export const formSelect = style([
  formInput,
  {
    cursor: 'pointer',
  },
]);

export const modalFooter = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '10px',
  paddingTop: '12px',
  borderTop: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const progressTrack = style({
  width: '100%',
  height: '8px',
  borderRadius: '999px',
  backgroundColor: cssVarV2('layer/background/primary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  overflow: 'hidden',
});

export const progressFill = style({
  height: '100%',
  borderRadius: '999px',
  backgroundColor: cssVar('brandColor'),
  transition: 'width 0.3s ease',
});
