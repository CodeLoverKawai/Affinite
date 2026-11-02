import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export * from '../shared/workspace-page.css';

export const calendarRoot = style({
  display: 'flex',
  height: '100%',
  width: '100%',
  backgroundColor: cssVarV2('layer/background/primary'),
  color: cssVarV2('text/primary'),
  overflow: 'hidden',
});

export const headerBar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '0 20px',
  height: '56px',
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/primary'),
  gap: '12px',
});

export const headerLeft = style({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
});

export const headerTitleGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '18px',
  fontWeight: 700,
  color: cssVarV2('text/primary'),
});

export const headerTitleIcon = style({
  width: '20px',
  height: '20px',
  color: cssVar('brandColor'),
});

export const periodNavGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  padding: '3px',
  borderRadius: '8px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const navBtn = style({
  backgroundColor: 'transparent',
  border: 'none',
  color: cssVarV2('text/secondary'),
  padding: '4px 8px',
  borderRadius: '6px',
  fontSize: '12px',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease, color 0.15s ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
      color: cssVarV2('text/primary'),
    },
  },
});

export const todayNavBtn = style([
  navBtn,
  {
    padding: '4px 10px',
    fontWeight: 600,
    color: cssVarV2('text/primary'),
  },
]);

export const weeklyNoteHeaderBtn = style({
  backgroundColor: 'rgba(59, 130, 246, 0.12)',
  border: '1px solid rgba(59, 130, 246, 0.35)',
  color: cssVar('brandColor'),
  padding: '6px 12px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'opacity 0.15s ease',
  selectors: {
    '&:hover': {
      opacity: 0.9,
    },
    '&[data-exists="true"]': {
      backgroundColor: 'rgba(16, 185, 129, 0.14)',
      borderColor: 'rgba(16, 185, 129, 0.4)',
      color: '#10b981',
    },
  },
});

export const viewSwitcher = style({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  padding: '4px',
  borderRadius: '10px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const viewModeTab = style({
  backgroundColor: 'transparent',
  color: cssVarV2('text/secondary'),
  border: 'none',
  padding: '6px 12px',
  borderRadius: '7px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      color: cssVarV2('text/primary'),
      backgroundColor: cssVar('hoverColor'),
    },
    '&[data-active="true"]': {
      backgroundColor: cssVar('brandColor'),
      color: '#ffffff',
      boxShadow: cssVar('buttonShadow'),
    },
  },
});

export const headerRight = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
});

export const headerSearchInput = style({
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '8px',
  padding: '6px 10px',
  color: cssVarV2('text/primary'),
  fontSize: '12px',
  width: '170px',
  outline: 'none',
  transition: 'border-color 0.15s ease',
  selectors: {
    '&:focus': {
      borderColor: cssVar('brandColor'),
    },
  },
});

export const sidebarToggleBtn = style({
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  color: cssVarV2('text/secondary'),
  padding: '6px 10px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      color: cssVarV2('text/primary'),
      backgroundColor: cssVar('hoverColor'),
    },
    '&[data-active="true"]': {
      backgroundColor: 'rgba(168, 85, 247, 0.14)',
      borderColor: 'rgba(168, 85, 247, 0.4)',
      color: '#9333ea',
    },
  },
});

export const newTaskBtn = style({
  backgroundColor: cssVar('brandColor'),
  border: 'none',
  color: '#ffffff',
  padding: '7px 14px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  boxShadow: cssVar('buttonShadow'),
  transition: 'opacity 0.15s ease',
  selectors: {
    '&:hover': {
      opacity: 0.92,
    },
  },
});

export const mainViewport = style({
  flex: 1,
  height: '100%',
  overflowY: 'auto',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
});

export const filterControlBar = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '12px',
  padding: '10px 16px',
});

export const filterGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flexWrap: 'wrap',
});

export const filterGroupLabel = style({
  fontSize: '11px',
  color: cssVarV2('text/secondary'),
  fontWeight: 600,
  marginRight: '4px',
});

export const categoryChip = style({
  padding: '3px 10px',
  borderRadius: '12px',
  fontSize: '11px',
  fontWeight: 600,
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/primary'),
  color: cssVarV2('text/secondary'),
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      color: cssVarV2('text/primary'),
      borderColor: cssVar('brandColor'),
    },
    '&[data-active="true"]': {
      borderColor: cssVar('brandColor'),
      backgroundColor: cssVar('hoverColor'),
      color: cssVar('brandColor'),
    },
  },
});

export const sourceChip = style([
  categoryChip,
  {
    selectors: {
      '&[data-active="true"]': {
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.16)',
        color: '#10b981',
      },
    },
  },
]);

export const monthGridContainer = style({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '14px',
  overflow: 'hidden',
});

export const monthHeaderRow = style({
  display: 'grid',
  gridTemplateColumns: '125px repeat(7, minmax(0, 1fr))',
  backgroundColor: cssVarV2('layer/background/primary'),
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const monthWeeklyHeaderCell = style({
  padding: '10px 12px',
  fontSize: '11px',
  fontWeight: 700,
  color: cssVar('brandColor'),
  textTransform: 'uppercase',
  borderRight: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
});

export const monthWeekdayHeaderCell = style({
  padding: '10px 12px',
  fontSize: '11px',
  fontWeight: 700,
  color: cssVarV2('text/secondary'),
  textTransform: 'uppercase',
  textAlign: 'center',
  borderRight: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const monthWeeksBody = style({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
});

export const monthWeekRow = style({
  display: 'grid',
  gridTemplateColumns: '125px repeat(7, minmax(0, 1fr))',
  flex: 1,
  minHeight: '128px',
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const monthWeeklyNoteCell = style({
  padding: '10px',
  borderRight: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/primary'),
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  transition: 'background-color 0.15s ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
    },
    '&[data-current-week="true"]': {
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
    },
  },
});

export const monthWeekNumRow = style({
  fontSize: '12px',
  fontWeight: 700,
  color: cssVarV2('text/primary'),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  selectors: {
    '&[data-current-week="true"]': {
      color: cssVar('brandColor'),
    },
  },
});

export const monthWeekActiveBadge = style({
  fontSize: '9px',
  backgroundColor: 'rgba(16, 185, 129, 0.16)',
  color: '#10b981',
  padding: '1px 5px',
  borderRadius: '4px',
  border: '1px solid rgba(16, 185, 129, 0.35)',
});

export const monthWeekDateRange = style({
  fontSize: '10px',
  color: cssVarV2('text/secondary'),
  marginTop: '2px',
});

export const monthWeeklyActionPill = style({
  fontSize: '11px',
  fontWeight: 600,
  color: cssVar('brandColor'),
  backgroundColor: 'rgba(59, 130, 246, 0.1)',
  border: '1px solid rgba(59, 130, 246, 0.25)',
  borderRadius: '6px',
  padding: '5px 6px',
  textAlign: 'center',
  selectors: {
    '&[data-exists="true"]': {
      color: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
  },
});

export const monthDayCell = style({
  padding: '8px',
  borderRight: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: 'transparent',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  minWidth: 0,
  selectors: {
    '&[data-outside-month="true"]': {
      backgroundColor: cssVarV2('layer/background/primary'),
      opacity: 0.55,
    },
    '&[data-today="true"]': {
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
    },
  },
});

export const monthDayTopBar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const monthDayNumber = style({
  fontSize: '12px',
  fontWeight: 600,
  color: cssVarV2('text/primary'),
  borderRadius: '999px',
  selectors: {
    '&[data-today="true"]': {
      fontWeight: 800,
      color: '#ffffff',
      backgroundColor: cssVar('brandColor'),
      padding: '2px 7px',
    },
  },
});

export const monthDayActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
});

export const monthDayIconBtn = style({
  backgroundColor: cssVarV2('layer/background/primary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  color: cssVarV2('text/secondary'),
  borderRadius: '5px',
  padding: '2px 6px',
  fontSize: '10px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
      color: cssVarV2('text/primary'),
    },
    '&[data-exists="true"]': {
      backgroundColor: 'rgba(16, 185, 129, 0.16)',
      borderColor: 'rgba(16, 185, 129, 0.4)',
      color: '#10b981',
    },
  },
});

export const monthDayItemsList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  overflowY: 'auto',
  maxHeight: '115px',
});

export const monthTaskPill = style({
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  padding: '4px 6px',
  borderRadius: '6px',
  fontSize: '11px',
  cursor: 'pointer',
  color: cssVarV2('text/primary'),
  selectors: {
    '&[data-completed="true"]': {
      opacity: 0.55,
      backgroundColor: cssVarV2('layer/background/primary'),
      borderColor: cssVarV2('layer/insideBorder/border'),
    },
  },
});

export const monthTaskTitle = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: cssVarV2('text/primary'),
  flex: 1,
  selectors: {
    '&[data-completed="true"]': {
      textDecoration: 'line-through',
    },
  },
});

export const monthBoardPill = style({
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  padding: '4px 6px',
  borderRadius: '6px',
  backgroundColor: 'rgba(168, 85, 247, 0.12)',
  border: '1px solid rgba(168, 85, 247, 0.35)',
  fontSize: '11px',
  cursor: 'pointer',
  color: cssVarV2('text/primary'),
  selectors: {
    '&[data-done="true"]': {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      opacity: 0.6,
    },
  },
});

export const monthBoardTag = style({
  fontSize: '9px',
  fontWeight: 700,
  color: '#9333ea',
  flexShrink: 0,
});

export const monthBoardTitle = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: cssVarV2('text/primary'),
  flex: 1,
  selectors: {
    '&[data-done="true"]': {
      textDecoration: 'line-through',
    },
  },
});

export const weekViewContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  flex: 1,
  minHeight: '700px',
});

export const weeklyBanner = style({
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '12px',
  padding: '12px 18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '10px',
});

export const weeklyBannerLeft = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
});

export const weeklyKeyBadge = style({
  backgroundColor: cssVar('brandColor'),
  color: '#ffffff',
  fontWeight: 800,
  fontSize: '11px',
  padding: '2px 8px',
  borderRadius: '999px',
});

export const weeklyBannerTitle = style({
  fontSize: '15px',
  fontWeight: 700,
  color: cssVarV2('text/primary'),
});

export const weeklyNoteCreateBtn = style({
  backgroundColor: '#10b981',
  border: 'none',
  color: '#ffffff',
  padding: '7px 14px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: cssVar('buttonShadow'),
  transition: 'opacity 0.15s ease',
  selectors: {
    '&:hover': {
      opacity: 0.92,
    },
  },
});

export const timeGridContainer = style({
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '14px',
  overflow: 'hidden',
  flex: 1,
});

export const timeGridHeaderRow = style({
  display: 'grid',
  gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))',
  backgroundColor: cssVarV2('layer/background/primary'),
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  position: 'sticky',
  top: 0,
  zIndex: 20,
});

export const timeGridGmtCell = style({
  padding: '10px 6px',
  fontSize: '10px',
  fontWeight: 700,
  color: cssVarV2('text/secondary'),
  textAlign: 'center',
  borderRight: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const timeGridDayHeaderCell = style({
  padding: '8px 6px',
  textAlign: 'center',
  borderRight: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: 'transparent',
  selectors: {
    '&[data-today="true"]': {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
  },
});

export const timeGridDayName = style({
  fontSize: '11px',
  fontWeight: 700,
  color: cssVarV2('text/secondary'),
  textTransform: 'uppercase',
  selectors: {
    '&[data-today="true"]': {
      color: cssVar('brandColor'),
    },
  },
});

export const timeGridDayNumber = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  backgroundColor: 'transparent',
  color: cssVarV2('text/primary'),
  fontSize: '14px',
  fontWeight: 800,
  marginTop: '2px',
  selectors: {
    '&[data-today="true"]': {
      backgroundColor: cssVar('brandColor'),
      color: '#ffffff',
    },
  },
});

export const timeGridJournalBtn = style({
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  color: cssVarV2('text/secondary'),
  borderRadius: '4px',
  padding: '1px 5px',
  fontSize: '9px',
  cursor: 'pointer',
  marginTop: '2px',
  selectors: {
    '&[data-exists="true"]': {
      backgroundColor: 'rgba(16, 185, 129, 0.16)',
      borderColor: 'rgba(16, 185, 129, 0.4)',
      color: '#10b981',
    },
  },
});

export const allDayStripRow = style({
  display: 'grid',
  gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))',
  backgroundColor: cssVarV2('layer/background/primary'),
  borderBottom: `2px solid ${cssVarV2('layer/insideBorder/border')}`,
  minHeight: '44px',
});

export const allDayLabelCell = style({
  padding: '6px',
  fontSize: '10px',
  fontWeight: 700,
  color: cssVarV2('text/secondary'),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRight: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const allDayDayCell = style({
  padding: '4px',
  borderRight: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
});

export const allDayTaskChip = style({
  borderRadius: '4px',
  padding: '2px 5px',
  fontSize: '10px',
  fontWeight: 600,
  color: cssVarV2('text/primary'),
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  selectors: {
    '&[data-completed="true"]': {
      textDecoration: 'line-through',
      opacity: 0.6,
    },
  },
});

export const allDayBoardChip = style({
  backgroundColor: 'rgba(168, 85, 247, 0.16)',
  border: '1px solid rgba(168, 85, 247, 0.4)',
  borderRadius: '4px',
  padding: '2px 5px',
  fontSize: '10px',
  fontWeight: 600,
  color: cssVarV2('text/primary'),
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  selectors: {
    '&[data-done="true"]': {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      borderColor: 'rgba(16, 185, 129, 0.35)',
    },
  },
});

export const verticalGridScrollArea = style({
  display: 'grid',
  gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))',
  position: 'relative',
  overflowY: 'auto',
});

export const timeAxisColumn = style({
  borderRight: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/primary'),
});

export const timeAxisSlot = style({
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  padding: '4px 6px',
  fontSize: '10px',
  fontWeight: 600,
  color: cssVarV2('text/secondary'),
  textAlign: 'right',
  boxSizing: 'border-box',
});

export const dayGridColumn = style({
  position: 'relative',
  borderRight: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: 'transparent',
  userSelect: 'none',
  selectors: {
    '&[data-today="true"]': {
      backgroundColor: 'rgba(59, 130, 246, 0.04)',
    },
  },
});

export const hourGridSlot = style({
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  boxSizing: 'border-box',
});

export const currentTimeLine = style({
  position: 'absolute',
  left: 0,
  right: 0,
  height: '2px',
  backgroundColor: '#ef4444',
  zIndex: 10,
  pointerEvents: 'none',
  boxShadow: '0 0 6px rgba(239, 68, 68, 0.8)',
});

export const currentTimeDot = style({
  position: 'absolute',
  left: '-4px',
  top: '-4px',
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  backgroundColor: '#ef4444',
});

export const timedEventCard = style({
  position: 'absolute',
  left: '3px',
  right: '3px',
  borderRadius: '6px',
  padding: '4px 6px',
  overflow: 'hidden',
  fontSize: '11px',
  cursor: 'pointer',
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  boxShadow: cssVar('buttonShadow'),
  color: cssVarV2('text/primary'),
  backgroundColor: cssVarV2('layer/background/overlayPanel'),
  selectors: {
    '&[data-completed="true"]': {
      opacity: 0.6,
    },
  },
});

export const timedEventHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
});

export const timedEventTitle = style({
  fontWeight: 700,
  color: cssVarV2('text/primary'),
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  selectors: {
    '&[data-completed="true"]': {
      textDecoration: 'line-through',
    },
  },
});

export const timedEventTimeLabel = style({
  fontSize: '10px',
  color: cssVarV2('text/secondary'),
});

export const dragGhostBlock = style({
  position: 'absolute',
  left: '3px',
  right: '3px',
  backgroundColor: 'rgba(59, 130, 246, 0.25)',
  border: `2px dashed ${cssVar('brandColor')}`,
  borderRadius: '6px',
  pointerEvents: 'none',
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: cssVarV2('text/primary'),
  fontSize: '11px',
  fontWeight: 700,
});

export const dayViewContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '14px',
  padding: '16px',
});

export const dayHeaderBanner = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderRadius: '10px',
  backgroundColor: cssVarV2('layer/background/primary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  gap: '12px',
  selectors: {
    '&[data-today="true"]': {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: cssVar('brandColor'),
    },
  },
});

export const dayHeaderTitle = style({
  fontSize: '17px',
  fontWeight: 800,
  color: cssVarV2('text/primary'),
});

export const dayHeaderSubtitle = style({
  fontSize: '11px',
  color: cssVarV2('text/secondary'),
});

export const dayVerticalGridContainer = style({
  display: 'grid',
  gridTemplateColumns: '70px 1fr',
  position: 'relative',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '10px',
  overflow: 'hidden',
  backgroundColor: cssVarV2('layer/background/primary'),
});

export const dayTimedEventCard = style({
  position: 'absolute',
  left: '10px',
  right: '10px',
  borderRadius: '8px',
  padding: '6px 12px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  zIndex: 2,
  boxShadow: cssVar('buttonShadow'),
  color: cssVarV2('text/primary'),
  backgroundColor: cssVarV2('layer/background/overlayPanel'),
  selectors: {
    '&[data-completed="true"]': {
      opacity: 0.6,
    },
  },
});

export const agendaContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
});

export const kpiGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '14px',
});

export const kpiCard = style({
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '12px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
});

export const kpiLabel = style({
  fontSize: '11px',
  fontWeight: 700,
  color: cssVarV2('text/secondary'),
  textTransform: 'uppercase',
});

export const kpiValue = style({
  fontSize: '26px',
  fontWeight: 800,
  color: cssVarV2('text/primary'),
});

export const agendaGroupsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '16px',
});

export const agendaGroupCard = style({
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '12px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
});

export const agendaGroupHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const agendaGroupTitle = style({
  fontSize: '14px',
  fontWeight: 700,
  color: cssVarV2('text/primary'),
});

export const agendaGroupCount = style({
  fontSize: '11px',
  fontWeight: 700,
  backgroundColor: cssVar('hoverColor'),
  padding: '2px 8px',
  borderRadius: '999px',
  color: cssVarV2('text/secondary'),
});

export const agendaEmptyText = style({
  fontSize: '12px',
  color: cssVarV2('text/secondary'),
  padding: '12px 0',
});

export const agendaItemsList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
});

export const agendaTaskCard = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px',
  borderRadius: '8px',
  backgroundColor: cssVarV2('layer/background/primary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  cursor: 'pointer',
  transition: 'border-color 0.15s ease',
  selectors: {
    '&:hover': {
      borderColor: cssVar('brandColor'),
    },
  },
});

export const agendaBoardCard = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px',
  borderRadius: '8px',
  backgroundColor: 'rgba(168, 85, 247, 0.08)',
  border: '1px solid rgba(168, 85, 247, 0.35)',
  cursor: 'pointer',
});

export const agendaItemLeft = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

export const agendaItemTitle = style({
  fontSize: '13px',
  fontWeight: 600,
  color: cssVarV2('text/primary'),
  selectors: {
    '&[data-completed="true"]': {
      textDecoration: 'line-through',
    },
  },
});

export const agendaItemMeta = style({
  fontSize: '11px',
  color: cssVarV2('text/secondary'),
});

export const rightSidebar = style({
  width: '290px',
  borderLeft: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  overflowY: 'auto',
});

export const miniCalendarCard = style({
  backgroundColor: cssVarV2('layer/background/primary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '12px',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
});

export const miniCalendarHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const miniCalendarTitle = style({
  fontSize: '13px',
  fontWeight: 700,
  color: cssVarV2('text/primary'),
});

export const miniCalendarWeekdays = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  textAlign: 'center',
  fontSize: '10px',
  fontWeight: 700,
  color: cssVarV2('text/secondary'),
});

export const miniCalendarGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '2px',
});

export const miniDayButton = style({
  backgroundColor: 'transparent',
  border: 'none',
  color: cssVarV2('text/primary'),
  borderRadius: '50%',
  width: '26px',
  height: '26px',
  fontSize: '11px',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: 'auto',
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
    },
    '&[data-outside="true"]': {
      color: cssVarV2('text/secondary'),
      opacity: 0.55,
    },
    '&[data-today="true"]': {
      border: `1px solid ${cssVar('brandColor')}`,
      backgroundColor: 'rgba(59, 130, 246, 0.16)',
      fontWeight: 700,
    },
    '&[data-selected="true"]': {
      backgroundColor: cssVar('brandColor'),
      color: '#ffffff',
      fontWeight: 700,
    },
  },
});

export const unscheduledTitleRow = style({
  fontSize: '13px',
  fontWeight: 700,
  color: cssVarV2('text/primary'),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const unscheduledCountBadge = style({
  fontSize: '11px',
  backgroundColor: 'rgba(168, 85, 247, 0.16)',
  color: '#9333ea',
  padding: '2px 7px',
  borderRadius: '999px',
});

export const unscheduledSubtext = style({
  fontSize: '11px',
  color: cssVarV2('text/secondary'),
  marginTop: '4px',
});

export const unscheduledEmptyBox = style({
  fontSize: '12px',
  color: cssVarV2('text/secondary'),
  padding: '20px 10px',
  textAlign: 'center',
  border: `1px dashed ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '10px',
});

export const unscheduledList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
});

export const unscheduledCard = style({
  backgroundColor: cssVarV2('layer/background/primary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '10px',
  padding: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  cursor: 'grab',
});

export const unscheduledCardTitle = style({
  fontSize: '13px',
  fontWeight: 600,
  color: cssVarV2('text/primary'),
  cursor: 'pointer',
});

export const unscheduledCardMeta = style({
  fontSize: '11px',
  color: '#9333ea',
  display: 'flex',
  justifyContent: 'space-between',
});

export const unscheduledDateRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
});

export const unscheduledDateInput = style({
  flex: 1,
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '6px',
  color: cssVarV2('text/primary'),
  padding: '4px 6px',
  fontSize: '11px',
});

export const unscheduledTodayBtn = style({
  backgroundColor: 'rgba(59, 130, 246, 0.15)',
  border: '1px solid rgba(59, 130, 246, 0.4)',
  color: cssVar('brandColor'),
  borderRadius: '6px',
  padding: '4px 8px',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
});

export const colorSwatchesRow = style({
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  flexWrap: 'wrap',
});

export const colorSwatchBtn = style({
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  border: '2px solid transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.15s ease',
  selectors: {
    '&[data-selected="true"]': {
      borderColor: cssVarV2('text/primary'),
      transform: 'scale(1.1)',
    },
  },
});

export const allDayCheckboxRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  paddingBottom: '8px',
});

export const allDayCheckboxLabel = style({
  fontSize: '13px',
  color: cssVarV2('text/primary'),
  cursor: 'pointer',
  fontWeight: 600,
});

export const modalActionsRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingTop: '12px',
  borderTop: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});
