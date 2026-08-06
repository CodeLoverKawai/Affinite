import { style } from '@vanilla-extract/css';
import { cssVar } from '@toeverything/theme';

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

export const statusBadge = style({
  fontSize: '12px',
  padding: '4px 8px',
  borderRadius: '6px',
  fontWeight: 500,
  selectors: {
    '&[data-status="success"]': {
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      color: '#16a34a',
    },
    '&[data-status="error"]': {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      color: '#dc2626',
    },
    '&[data-status="testing"]': {
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
      color: '#2563eb',
    },
  },
});
