import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  width: '100%',
  marginTop: '16px',
  padding: '16px',
  borderRadius: '12px',
  backgroundColor: cssVar('backgroundSecondaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
});

export const title = style({
  fontSize: '14px',
  fontWeight: 600,
  color: cssVar('textPrimaryColor'),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const providerGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
  gap: '8px',
});

export const providerBtn = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  padding: '10px 8px',
  borderRadius: '8px',
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
  color: cssVar('textSecondaryColor'),
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover': {
      borderColor: cssVar('brandColor'),
      color: cssVar('textPrimaryColor'),
    },
    '&[data-active="true"]': {
      borderColor: cssVar('brandColor'),
      backgroundColor: cssVar('hoverColor'),
      color: cssVar('brandColor'),
      fontWeight: 600,
    },
  },
});

export const inputGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
});

export const label = style({
  fontSize: '12px',
  fontWeight: 500,
  color: cssVar('textSecondaryColor'),
});

export const input = style({
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
  color: cssVar('textPrimaryColor'),
  fontSize: '13px',
  outline: 'none',
  selectors: {
    '&:focus': {
      borderColor: cssVar('brandColor'),
    },
  },
});

export const select = style({
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
  color: cssVar('textPrimaryColor'),
  fontSize: '13px',
  outline: 'none',
  cursor: 'pointer',
  selectors: {
    '&:focus': {
      borderColor: cssVar('brandColor'),
    },
  },
});

export const flexRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

export const actionRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginTop: '8px',
});

export const statusBadge = style({
  fontSize: '12px',
  padding: '4px 8px',
  borderRadius: '6px',
  fontWeight: 500,
  selectors: {
    '&[data-status="success"]': {
      backgroundColor: cssVarV2('layer/background/secondary'),
      color: cssVarV2('status/success'),
    },
    '&[data-status="error"]': {
      backgroundColor: cssVarV2('layer/background/secondary'),
      color: cssVarV2('status/error'),
    },
    '&[data-status="testing"]': {
      backgroundColor: cssVarV2('layer/background/secondary'),
      color: cssVar('processingColor'),
    },
  },
});

export const zeroKeyBanner = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 500,
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVar('borderColor')}`,
  color: cssVarV2('status/success'),
});

export const detectedInfoText = style({
  fontSize: '11px',
  opacity: 0.9,
  color: cssVar('textSecondaryColor'),
});

export const usageStatCard = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '10px 14px',
  borderRadius: '10px',
  backgroundColor: cssVar('backgroundSecondaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  marginTop: '8px',
});

export const usageStatItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
});

export const usageStatLabel = style({
  fontSize: '11px',
  color: cssVar('textSecondaryColor'),
});

export const usageStatValue = style({
  fontSize: '13px',
  fontWeight: 600,
  color: cssVar('textPrimaryColor'),
});

export const usageProgressBarFill = style({
  backgroundColor: cssVar('processingColor'),
  selectors: {
    '&[data-high="true"]': {
      backgroundColor: cssVar('errorColor'),
    },
  },
});
