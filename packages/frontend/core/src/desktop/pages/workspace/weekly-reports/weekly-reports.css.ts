import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

import {
  badge,
  headerToolbar,
  interactiveSurfaceCard,
  pageBody,
  pageContainer,
  primaryActionButton,
  progressFill,
  progressTrack,
  secondaryActionButton,
  statCard,
  statLabel,
  statsGrid,
  statSubtext,
  statValue,
  surfaceCard,
} from '../shared/workspace-page.css';

export {
  badge,
  headerToolbar,
  interactiveSurfaceCard,
  pageBody,
  pageContainer,
  primaryActionButton,
  progressFill,
  progressTrack,
  secondaryActionButton,
  statCard,
  statLabel,
  statsGrid,
  statSubtext,
  statValue,
  surfaceCard,
};

export const headerTitleGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontWeight: 600,
  fontSize: '14px',
  color: cssVarV2('text/primary'),
});

export const headerIcon = style({
  color: cssVar('brandColor'),
  width: '18px',
  height: '18px',
});

export const headerActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

export const controlBar = style([
  surfaceCard,
  {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '16px 20px',
  },
]);

export const navGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap',
});

export const navButton = style([
  secondaryActionButton,
  {
    backgroundColor: cssVarV2('layer/background/primary'),
  },
]);

export const thisWeekButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '7px 14px',
  borderRadius: '8px',
  border: `1px solid ${cssVar('brandColor')}`,
  backgroundColor: cssVar('hoverColor'),
  color: cssVar('brandColor'),
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '13px',
  transition: 'background-color 0.15s ease, border-color 0.15s ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('brandColor'),
      color: '#ffffff',
    },
  },
});

export const weekHeadingGroup = style({
  marginLeft: '6px',
  display: 'flex',
  alignItems: 'baseline',
  flexWrap: 'wrap',
  gap: '10px',
});

export const weekKeyText = style({
  fontSize: '20px',
  fontWeight: 700,
  letterSpacing: '-0.01em',
  color: cssVarV2('text/primary'),
});

export const weekRangeText = style({
  fontSize: '14px',
  color: cssVarV2('text/secondary'),
});

export const metricsActionsGroup = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '12px',
});

export const consistencyPill = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 14px',
  borderRadius: '20px',
  fontSize: '13px',
  fontWeight: 600,
  backgroundColor: 'rgba(245, 158, 11, 0.14)',
  border: '1px solid rgba(245, 158, 11, 0.35)',
  color: '#d97706',
  selectors: {
    '&[data-high="true"]': {
      backgroundColor: 'rgba(16, 185, 129, 0.14)',
      borderColor: 'rgba(16, 185, 129, 0.35)',
      color: '#059669',
    },
  },
});

export const sectionContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
});

export const sectionHeader = style({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
});

export const sectionTitle = style({
  margin: 0,
  fontSize: '16px',
  fontWeight: 600,
  color: cssVarV2('text/primary'),
});

export const sectionSubtitle = style({
  fontSize: '12px',
  color: cssVarV2('text/secondary'),
});

export const daysGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '12px',
});

export const dayCard = style({
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px dashed ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '12px',
  padding: '14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  cursor: 'pointer',
  color: cssVarV2('text/primary'),
  transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
  selectors: {
    '&:hover': {
      transform: 'translateY(-2px)',
      borderColor: cssVar('brandColor'),
      boxShadow: cssVar('buttonShadow'),
    },
    '&[data-exists="true"]': {
      borderStyle: 'solid',
      borderColor: 'rgba(16, 185, 129, 0.4)',
      backgroundColor: cssVarV2('layer/background/secondary'),
    },
    '&[data-today="true"]': {
      borderStyle: 'solid',
      borderWidth: '2px',
      borderColor: cssVar('brandColor'),
      backgroundColor: cssVar('hoverColor'),
    },
  },
});

export const dayCardHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const dayNameText = style({
  fontWeight: 700,
  fontSize: '14px',
  color: cssVarV2('text/primary'),
  selectors: {
    '&[data-today="true"]': {
      color: cssVar('brandColor'),
    },
  },
});

export const todayBadge = style({
  fontSize: '10px',
  fontWeight: 700,
  padding: '2px 6px',
  borderRadius: '10px',
  backgroundColor: cssVar('brandColor'),
  color: '#ffffff',
});

export const dayDateRow = style({
  display: 'flex',
  alignItems: 'baseline',
  gap: '6px',
});

export const dayDateFormatted = style({
  fontSize: '13px',
  fontWeight: 600,
  color: cssVarV2('text/primary'),
});

export const dayDateIso = style({
  fontSize: '11px',
  color: cssVarV2('text/secondary'),
});

export const dayStatusRow = style({
  margin: '4px 0 2px',
});

export const dayStatusBadge = style({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 500,
  backgroundColor: cssVarV2('layer/background/primary'),
  color: cssVarV2('text/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  selectors: {
    '&[data-exists="true"]': {
      fontWeight: 600,
      backgroundColor: 'rgba(16, 185, 129, 0.14)',
      color: '#059669',
      borderColor: 'rgba(16, 185, 129, 0.35)',
    },
  },
});

export const daySnippet = style({
  fontSize: '11px',
  color: cssVarV2('text/secondary'),
  margin: '2px 0 4px',
  lineHeight: 1.4,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
});

export const dayActionFooter = style({
  marginTop: 'auto',
  paddingTop: '6px',
});

export const dayOpenLink = style({
  fontSize: '12px',
  fontWeight: 600,
  color: cssVar('brandColor'),
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
});

export const dayCreateLink = style({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '11px',
  color: cssVarV2('text/secondary'),
});

export const smallIcon = style({
  width: '12px',
  height: '12px',
});

export const mediumIcon = style({
  width: '16px',
  height: '16px',
});

export const masterNoteCard = style([
  surfaceCard,
  {
    padding: '20px 24px',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
]);

export const masterNoteInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
});

export const emojiLarge = style({
  fontSize: '26px',
  lineHeight: 1,
});

export const masterNoteTitleRow = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '10px',
});

export const masterNoteTitle = style({
  margin: 0,
  fontSize: '17px',
  fontWeight: 700,
  color: cssVarV2('text/primary'),
});

export const masterNoteStatusBadge = style({
  padding: '3px 10px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  backgroundColor: 'rgba(245, 158, 11, 0.14)',
  color: '#d97706',
  border: '1px solid rgba(245, 158, 11, 0.35)',
  selectors: {
    '&[data-created="true"]': {
      backgroundColor: 'rgba(16, 185, 129, 0.14)',
      color: '#059669',
      borderColor: 'rgba(16, 185, 129, 0.35)',
    },
  },
});

export const masterNoteDescription = style({
  margin: '6px 0 0',
  fontSize: '13px',
  color: cssVarV2('text/secondary'),
});

export const streakCard = style([
  surfaceCard,
  {
    padding: '18px 24px',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    backgroundColor: cssVarV2('layer/background/secondary'),
    border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  },
]);

export const streakTitle = style({
  margin: 0,
  fontSize: '16px',
  fontWeight: 700,
  color: cssVarV2('text/primary'),
});

export const streakDescription = style({
  margin: '4px 0 0',
  fontSize: '13px',
  color: cssVarV2('text/secondary'),
});

export const habitChip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 16px',
  borderRadius: '8px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/primary'),
  color: cssVarV2('text/primary'),
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '13px',
  transition: 'background-color 0.15s ease, border-color 0.15s ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
      borderColor: cssVar('brandColor'),
      color: cssVar('brandColor'),
    },
  },
});

export const agendaItem = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
  padding: '10px 14px',
  borderRadius: '8px',
  backgroundColor: cssVarV2('layer/background/primary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  color: cssVarV2('text/primary'),
});

export const boardColumn = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  padding: '14px',
  borderRadius: '12px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  color: cssVarV2('text/primary'),
});

export const searchBox = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '8px',
  padding: '6px 12px',
  width: '280px',
  selectors: {
    '&:focus-within': {
      borderColor: cssVar('brandColor'),
    },
  },
});

export const searchIcon = style({
  width: '16px',
  height: '16px',
  color: cssVarV2('text/secondary'),
  flexShrink: 0,
});

export const searchInput = style({
  backgroundColor: 'transparent',
  border: 'none',
  outline: 'none',
  color: cssVarV2('text/primary'),
  fontSize: '13px',
  width: '100%',
});

export const historyGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: '10px',
});

export const historyCard = style({
  padding: '12px 14px',
  borderRadius: '10px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  color: cssVarV2('text/primary'),
  transition: 'border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
  selectors: {
    '&:hover': {
      borderColor: cssVar('brandColor'),
      transform: 'translateY(-1px)',
      boxShadow: cssVar('buttonShadow'),
    },
    '&[data-selected="true"]': {
      backgroundColor: cssVar('hoverColor'),
      borderColor: cssVar('brandColor'),
    },
  },
});

export const historyCardTop = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const historyWeekLabel = style({
  fontWeight: 600,
  fontSize: '13px',
  color: cssVarV2('text/primary'),
  selectors: {
    '&[data-selected="true"]': {
      color: cssVar('brandColor'),
    },
  },
});

export const historyDaysCount = style({
  fontSize: '11px',
  fontWeight: 600,
  color: cssVarV2('text/secondary'),
  selectors: {
    '&[data-high="true"]': {
      color: '#059669',
    },
  },
});

export const historyDateRange = style({
  fontSize: '11px',
  color: cssVarV2('text/secondary'),
});

export const historyProgressTrack = style([
  progressTrack,
  {
    height: '5px',
    marginTop: '2px',
  },
]);

export const historyProgressFill = style([
  progressFill,
  {
    selectors: {
      '&[data-high="true"]': {
        backgroundColor: '#10b981',
      },
    },
  },
]);

export const snapshotCard = style([
  surfaceCard,
  {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: 'var(--affine-background-secondary-color, rgba(0, 0, 0, 0.02))',
    border: `1px solid var(--affine-border-color, ${cssVarV2('layer/insideBorder/border')})`,
  },
]);

export const snapshotHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '12px',
});

export const consistencyBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 12px',
  borderRadius: '16px',
  fontSize: '12px',
  fontWeight: 600,
  backgroundColor: 'rgba(16, 185, 129, 0.12)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  color: '#059669',
  selectors: {
    '&[data-tier="low"]': {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      color: '#dc2626',
    },
    '&[data-tier="mid"]': {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
      color: '#d97706',
    },
  },
});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '12px',
});

export const metricBox = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: '12px 14px',
  borderRadius: '10px',
  backgroundColor: cssVarV2('layer/background/primary'),
  border: `1px solid var(--affine-border-color, ${cssVarV2('layer/insideBorder/border')})`,
});

export const metricNumber = style({
  fontSize: '18px',
  fontWeight: 700,
  letterSpacing: '-0.01em',
  color: 'var(--affine-text-primary-color, inherit)',
});

export const metricLabel = style({
  fontSize: '12px',
  color: cssVarV2('text/secondary'),
  fontWeight: 500,
});

export const progressBarTrack = style([
  progressTrack,
  {
    height: '6px',
    marginTop: '4px',
    borderRadius: '3px',
    backgroundColor: 'var(--affine-border-color, rgba(0, 0, 0, 0.08))',
  },
]);

export const progressBarFill = style([
  progressFill,
  {
    borderRadius: '3px',
    backgroundColor: 'var(--affine-brand-color, #1e96eb)',
    transition: 'width 0.3s ease',
  },
]);

export const daysRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  padding: '12px 16px',
  borderRadius: '10px',
  backgroundColor: cssVarV2('layer/background/primary'),
  border: `1px solid var(--affine-border-color, ${cssVarV2('layer/insideBorder/border')})`,
});

export const dayDotBox = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  flex: 1,
});

export const dayDotLabel = style({
  fontSize: '11px',
  fontWeight: 600,
  color: cssVarV2('text/secondary'),
});

export const dayDotIndicator = style({
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  backgroundColor: cssVarV2('layer/insideBorder/border'),
  transition: 'background-color 0.2s ease, transform 0.15s ease',
  selectors: {
    '&[data-completed="true"]': {
      backgroundColor: '#10b981',
      boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)',
    },
    '&[data-partial="true"]': {
      backgroundColor: '#f59e0b',
    },
  },
});

export const streaksList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
});

export const streakChip = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '12px',
  backgroundColor: cssVarV2('layer/background/primary'),
  border: `1px solid var(--affine-border-color, ${cssVarV2('layer/insideBorder/border')})`,
  color: 'var(--affine-text-primary-color, inherit)',
});

