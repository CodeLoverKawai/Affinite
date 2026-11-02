import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

import {
  dangerActionButton,
  filterBar,
  filterPill,
  formGroup,
  formInput,
  formLabel,
  formRow,
  formSelect,
  headerToolbar,
  modalFooter,
  modalForm,
  modalHeaderTitle,
  pageBody,
  pageContainer,
  primaryActionButton,
  progressFill,
  progressTrack,
  secondaryActionButton,
  segmentButton,
  segmentedControl,
  statCard,
  statLabel,
  statsGrid,
  statValue,
  surfaceCard,
} from '../shared/workspace-page.css';

export {
  dangerActionButton,
  filterBar,
  filterPill,
  formGroup,
  formInput,
  formLabel,
  formRow,
  formSelect,
  modalFooter,
  modalForm,
  modalHeaderTitle,
  pageBody,
  pageContainer,
  primaryActionButton,
  progressFill,
  progressTrack,
  secondaryActionButton,
  segmentButton,
  segmentedControl,
  statCard,
  statLabel,
  statsGrid,
  statValue,
  surfaceCard,
};

export const headerBar = style([
  headerToolbar,
  {
    height: '52px',
    padding: '0 20px',
    backgroundColor: cssVarV2('layer/background/primary'),
    borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  },
]);

export const headerLeftGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
});

export const headerTitle = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '16px',
  fontWeight: 700,
  color: cssVarV2('text/primary'),
});

export const headerActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
});

export const weekLabelBtn = style([
  segmentButton,
  {
    fontWeight: 600,
    color: cssVarV2('text/primary'),
  },
]);

export const kpiValueBrand = style([
  statValue,
  {
    color: cssVar('brandColor'),
  },
]);

export const kpiValueSuccess = style([
  statValue,
  {
    color: '#10b981',
  },
]);

export const kpiValueWarning = style([
  statValue,
  {
    color: '#f59e0b',
  },
]);

export const kpiValueStreak = style([
  statValue,
  {
    color: cssVar('errorColor'),
  },
]);

export const categoryFilterCard = style([
  surfaceCard,
  {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '10px 16px',
  },
]);

export const categoryFilterLabel = style({
  fontSize: '12px',
  fontWeight: 600,
  color: cssVarV2('text/secondary'),
  marginRight: '4px',
});

export const matrixCard = style([
  surfaceCard,
  {
    padding: 0,
    overflow: 'hidden',
  },
]);

export const matrixHeaderRow = style({
  display: 'grid',
  gridTemplateColumns: '260px repeat(7, minmax(0, 1fr)) 120px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const matrixHeaderHabitCell = style({
  padding: '12px 16px',
  fontSize: '11px',
  fontWeight: 700,
  color: cssVarV2('text/secondary'),
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderRight: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const matrixHeaderDayCell = style({
  padding: '10px 4px',
  textAlign: 'center',
  borderRight: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  selectors: {
    '&[data-today="true"]': {
      backgroundColor: cssVar('hoverColor'),
    },
  },
});

export const matrixDayShort = style({
  fontSize: '10px',
  fontWeight: 700,
  color: cssVarV2('text/secondary'),
  textTransform: 'uppercase',
  selectors: {
    '&[data-today="true"]': {
      color: cssVar('brandColor'),
    },
  },
});

export const matrixDayNumber = style({
  fontSize: '14px',
  fontWeight: 800,
  color: cssVarV2('text/primary'),
  selectors: {
    '&[data-today="true"]': {
      color: cssVar('brandColor'),
    },
  },
});

export const matrixHeaderStreakCell = style({
  padding: '12px 10px',
  textAlign: 'center',
  fontSize: '11px',
  fontWeight: 700,
  color: cssVar('errorColor'),
  textTransform: 'uppercase',
});

export const matrixRow = style({
  display: 'grid',
  gridTemplateColumns: '260px repeat(7, minmax(0, 1fr)) 120px',
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  alignItems: 'center',
  backgroundColor: cssVarV2('layer/background/primary'),
  transition: 'background-color 0.15s ease',
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
    },
  },
});

export const matrixHabitInfoCell = style({
  padding: '12px 16px',
  borderRight: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  cursor: 'pointer',
  overflow: 'hidden',
});

export const matrixHabitIcon = style({
  fontSize: '20px',
  flexShrink: 0,
});

export const matrixHabitTitle = style({
  fontSize: '13px',
  fontWeight: 700,
  color: cssVarV2('text/primary'),
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const matrixHabitMeta = style({
  fontSize: '11px',
  color: cssVarV2('text/secondary'),
});

export const matrixDayCell = style({
  padding: '8px 4px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  borderRight: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  selectors: {
    '&[data-today="true"]': {
      backgroundColor: cssVar('hoverColor'),
    },
  },
});

export const booleanCheckBtn = style({
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 700,
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      borderColor: cssVar('brandColor'),
    },
  },
});

export const quantCellContainer = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2px',
});

export const quantValueLabel = style({
  fontSize: '11px',
  fontWeight: 700,
  color: cssVarV2('text/secondary'),
  selectors: {
    '&[data-done="true"]': {
      color: '#10b981',
    },
  },
});

export const quantStepGroup = style({
  display: 'flex',
  gap: '2px',
});

export const quantStepBtn = style({
  width: '18px',
  height: '18px',
  borderRadius: '4px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/primary'),
  fontSize: '10px',
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'border-color 0.15s ease',
  selectors: {
    '&:hover': {
      borderColor: cssVar('brandColor'),
    },
  },
});

export const matrixStreakCell = style({
  padding: '10px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
});

export const matrixStreakValue = style({
  fontSize: '13px',
  fontWeight: 800,
  color: cssVar('errorColor'),
});

export const matrixWeeklyCount = style({
  fontSize: '10px',
  color: cssVarV2('text/secondary'),
});

export const sectionCard = style([
  surfaceCard,
  {
    padding: '20px',
    gap: '16px',
  },
]);

export const sectionTitle = style({
  fontSize: '16px',
  fontWeight: 700,
  color: cssVarV2('text/primary'),
});

export const sectionSubtitle = style({
  fontSize: '12px',
  color: cssVarV2('text/secondary'),
});

export const monthlyGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '14px',
});

export const monthlyHabitCard = style([
  surfaceCard,
  {
    backgroundColor: cssVarV2('layer/background/primary'),
    padding: '14px',
    gap: '10px',
  },
]);

export const monthlyHabitHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
});

export const monthlyHabitIcon = style({
  fontSize: '24px',
});

export const monthlyHabitTitle = style({
  fontWeight: 700,
  fontSize: '14px',
  color: cssVarV2('text/primary'),
});

export const monthlyProgressMeta = style({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '11px',
  color: cssVarV2('text/secondary'),
});

export const monthlyProgressValue = style({
  fontWeight: 700,
  color: '#10b981',
});

export const heatmapHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '8px',
});

export const heatmapGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(52, minmax(0, 1fr))',
  gap: '3px',
  padding: '10px 0',
  overflowX: 'auto',
});

export const heatmapWeekCol = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
});

export const heatmapCell = style({
  width: '12px',
  height: '12px',
  borderRadius: '2px',
  backgroundColor: cssVarV2('layer/background/primary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  selectors: {
    '&[data-level="1"]': {
      backgroundColor: 'rgba(16, 185, 129, 0.35)',
      borderColor: 'rgba(16, 185, 129, 0.45)',
    },
    '&[data-level="2"]': {
      backgroundColor: '#047857',
      borderColor: '#047857',
    },
    '&[data-level="3"]': {
      backgroundColor: '#059669',
      borderColor: '#059669',
    },
    '&[data-level="4"]': {
      backgroundColor: '#10b981',
      borderColor: '#10b981',
    },
  },
});

export const iconPickerGrid = style({
  display: 'flex',
  gap: '6px',
  flexWrap: 'wrap',
});

export const iconOptionBtn = style({
  fontSize: '18px',
  padding: '6px 10px',
  borderRadius: '8px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      borderColor: cssVar('brandColor'),
    },
    '&[data-active="true"]': {
      borderColor: cssVar('brandColor'),
      backgroundColor: cssVar('hoverColor'),
      boxShadow: cssVar('buttonShadow'),
    },
  },
});

export const colorSwatchRow = style({
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
});

export const colorSwatchBtn = style({
  width: '26px',
  height: '26px',
  borderRadius: '50%',
  border: '2px solid transparent',
  cursor: 'pointer',
  padding: 0,
  transition: 'transform 0.15s ease, border-color 0.15s ease',
  selectors: {
    '&[data-active="true"]': {
      borderColor: cssVarV2('text/primary'),
      transform: 'scale(1.12)',
    },
  },
});

export const modalFooterSpread = style([
  modalFooter,
  {
    justifyContent: 'space-between',
    marginTop: '8px',
  },
]);

export const modalFooterRight = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});
