import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const dashboardHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '0 24px',
  height: '60px',
  borderBottom: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
});

export const dashboardHeaderMobile = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '12px 16px',
  flexWrap: 'wrap',
  gap: '12px',
  borderBottom: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
});

export const dashboardTitle = style({
  fontSize: '20px',
  fontWeight: 700,
  color: cssVar('textPrimaryColor'),
  letterSpacing: '-0.01em',
});

export const dashboardTitleMobile = style({
  fontSize: '18px',
  fontWeight: 700,
  color: cssVar('textPrimaryColor'),
});

export const dashboardToolbar = style({
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
  flexWrap: 'wrap',
});

export const searchBox = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: cssVar('backgroundSecondaryColor'),
  padding: '6px 12px',
  borderRadius: '8px',
  border: `1px solid ${cssVar('borderColor')}`,
  width: '240px',
  transition: 'border-color 0.15s ease',
  selectors: {
    '&:focus-within': {
      borderColor: cssVar('primaryColor'),
    },
  },
});

export const searchBoxMobile = style([
  searchBox,
  {
    width: '160px',
  },
]);

export const searchIcon = style({
  color: cssVar('textSecondaryColor'),
  width: '16px',
  height: '16px',
  flexShrink: 0,
});

export const searchInput = style({
  border: 'none',
  backgroundColor: 'transparent',
  outline: 'none',
  width: '100%',
  fontSize: '13px',
  color: cssVar('textPrimaryColor'),
  selectors: {
    '&::placeholder': {
      color: cssVar('textSecondaryColor'),
    },
  },
});

export const createBtn = style({
  backgroundColor: cssVar('primaryColor'),
  color: cssVar('pureWhite'),
  border: 'none',
  borderRadius: '8px',
  padding: '8px 16px',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'opacity 0.15s ease, transform 0.1s ease',
  selectors: {
    '&:hover': {
      opacity: 0.92,
    },
    '&:active': {
      transform: 'scale(0.98)',
    },
  },
});

export const dashboardContainer = style({
  padding: '24px',
  height: '100%',
  overflowY: 'auto',
  backgroundColor: cssVar('backgroundPrimaryColor'),
  color: cssVar('textPrimaryColor'),
});

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '320px',
  gap: '16px',
  textAlign: 'center',
  borderRadius: '14px',
  backgroundColor: cssVar('backgroundSecondaryColor'),
  border: `1px dashed ${cssVar('borderColor')}`,
  padding: '32px 24px',
});

export const emptyIcon = style({
  width: '48px',
  height: '48px',
  color: cssVar('textSecondaryColor'),
});

export const emptyTitle = style({
  margin: 0,
  fontWeight: 700,
  fontSize: '18px',
  color: cssVar('textPrimaryColor'),
});

export const emptyDescription = style({
  margin: '6px 0 0 0',
  color: cssVar('textSecondaryColor'),
  fontSize: '14px',
});

export const boardGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: '20px',
});

export const boardItemCard = style({
  borderRadius: '12px',
  cursor: 'pointer',
  height: '132px',
  position: 'relative',
  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease',
  boxShadow: cssVar('buttonShadow'),
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundSecondaryColor'),
  color: cssVar('textPrimaryColor'),
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  overflow: 'hidden',
  selectors: {
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: cssVar('popoverShadow'),
      borderColor: cssVar('primaryColor'),
    },
  },
});

export const boardItemBanner = style({
  height: '36px',
  width: '100%',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  borderBottom: `1px solid ${cssVar('borderColor')}`,
  flexShrink: 0,
});

export const boardItemBody = style({
  position: 'relative',
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  flex: 1,
  padding: '12px 16px',
});

export const boardItemTitle = style({
  fontWeight: 700,
  fontSize: '16px',
  color: cssVar('textPrimaryColor'),
  letterSpacing: '-0.01em',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const boardItemFooter = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const boardItemBadge = style({
  fontSize: '11px',
  fontWeight: 600,
  color: cssVar('textSecondaryColor'),
  backgroundColor: cssVar('hoverColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  padding: '2px 8px',
  borderRadius: '6px',
});

export const boardItemDelete = style({
  backgroundColor: 'transparent',
  border: `1px solid transparent`,
  cursor: 'pointer',
  color: cssVar('textSecondaryColor'),
  padding: '5px',
  borderRadius: '6px',
  transition: 'all 0.15s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  selectors: {
    '&:hover': {
      color: cssVar('errorColor'),
      backgroundColor: cssVar('hoverColor'),
      borderColor: cssVar('borderColor'),
    },
  },
});

export const detailTopbar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '0 24px',
  height: '48px',
  borderBottom: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
});

export const backToBoardsBtn = style({
  backgroundColor: 'transparent',
  border: 'none',
  color: cssVar('textSecondaryColor'),
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '13px',
  fontWeight: 500,
  padding: '4px 8px',
  borderRadius: '6px',
  transition: 'color 0.15s ease, background-color 0.15s ease',
  selectors: {
    '&:hover': {
      color: cssVar('textPrimaryColor'),
      backgroundColor: cssVar('hoverColor'),
    },
  },
});

export const boardContainer = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  overflow: 'hidden',
  backgroundColor: cssVar('backgroundPrimaryColor'),
  color: cssVar('textPrimaryColor'),
  backgroundSize: 'cover',
  backgroundPosition: 'center',
});

export const boardOverlay = style({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1,
  pointerEvents: 'none',
  transition: 'background-color 0.2s ease',
});

export const boardContentWrapper = style({
  position: 'relative',
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  overflow: 'hidden',
});

export const boardDetailsHeader = style({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: '0 20px',
  height: '54px',
  backgroundColor: cssVar('backgroundOverlayPanelColor'),
  backdropFilter: 'blur(8px)',
  gap: '16px',
  borderBottom: `1px solid ${cssVar('borderColor')}`,
  zIndex: 10,
  justifyContent: 'space-between',
});

export const boardDetailsTitleContainer = style({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flex: 1,
  minWidth: 0,
});

export const boardDetailsTitleInput = style({
  backgroundColor: 'transparent',
  border: '1px solid transparent',
  color: cssVar('textPrimaryColor'),
  fontWeight: 700,
  fontSize: '18px',
  padding: '4px 10px',
  borderRadius: '8px',
  outline: 'none',
  transition: 'all 0.15s ease',
  maxWidth: '340px',
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
    },
    '&:focus': {
      backgroundColor: cssVar('backgroundPrimaryColor'),
      borderColor: cssVar('primaryColor'),
    },
  },
});

export const boardHeaderActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
});

export const viewSwitchGroup = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2px',
  padding: '3px',
  borderRadius: '8px',
  backgroundColor: cssVar('backgroundSecondaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
});

export const viewSwitchBtn = style({
  backgroundColor: 'transparent',
  border: 'none',
  color: cssVar('textSecondaryColor'),
  padding: '4px 10px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      color: cssVar('textPrimaryColor'),
      backgroundColor: cssVar('hoverColor'),
    },
    '&[data-active="true"]': {
      backgroundColor: cssVar('backgroundPrimaryColor'),
      color: cssVar('textPrimaryColor'),
      boxShadow: cssVar('buttonShadow'),
    },
  },
});

export const boardDetailsBackBtn = style({
  backgroundColor: cssVar('backgroundSecondaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  color: cssVar('textPrimaryColor'),
  padding: '6px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
      borderColor: cssVar('primaryColor'),
      transform: 'translateY(-1px)',
    },
  },
});

export const boardCanvas = style({
  display: 'flex',
  gap: '16px',
  padding: '20px',
  overflowX: 'auto',
  overflowY: 'hidden',
  flex: 1,
  alignItems: 'flex-start',
  width: '100%',
  boxSizing: 'border-box',
});

export const boardCol = style({
  width: '280px',
  minWidth: '280px',
  maxWidth: '280px',
  flexShrink: 0,
  backgroundColor: cssVar('backgroundSecondaryColor'),
  backdropFilter: 'blur(8px)',
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: '12px',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '100%',
  boxShadow: cssVar('buttonShadow'),
  padding: '12px',
  gap: '10px',
  transition:
    'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease, opacity 0.2s ease, border-color 0.2s ease',
});

export const boardColDragging = style({
  opacity: 0.45,
  transform: 'scale(0.97) rotate(0.8deg)',
  boxShadow: cssVar('popoverShadow'),
  borderColor: cssVar('primaryColor'),
});

export const boardColHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '4px 6px',
  cursor: 'grab',
  selectors: {
    '&:active': {
      cursor: 'grabbing',
    },
  },
});

export const boardColTitleGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  minWidth: 0,
});

export const boardColTitle = style({
  fontWeight: 700,
  fontSize: '14px',
  color: cssVar('textPrimaryColor'),
  wordWrap: 'break-word',
  maxWidth: '190px',
  letterSpacing: '-0.01em',
});

export const boardColCount = style({
  fontSize: '11px',
  fontWeight: 600,
  color: cssVar('textSecondaryColor'),
  backgroundColor: cssVar('hoverColor'),
  borderRadius: '999px',
  padding: '1px 7px',
});

export const boardColActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
});

export const boardColBtn = style({
  backgroundColor: 'transparent',
  border: `1px solid transparent`,
  fontSize: '14px',
  cursor: 'pointer',
  padding: '4px 6px',
  borderRadius: '6px',
  color: cssVar('textSecondaryColor'),
  transition: 'all 0.15s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
      color: cssVar('textPrimaryColor'),
    },
  },
});

export const boardColDelete = style({
  color: cssVar('textSecondaryColor'),
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
      color: cssVar('errorColor'),
    },
  },
});

export const boardCardsList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  overflowY: 'auto',
  overscrollBehaviorY: 'contain',
  flex: 1,
  paddingRight: '4px',
  minHeight: '24px',
});

export const boardCard = style({
  backgroundColor: cssVar('backgroundPrimaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: '8px',
  padding: '10px 12px',
  cursor: 'grab',
  boxShadow: cssVar('buttonShadow'),
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  transition:
    'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease, opacity 0.2s ease, border-color 0.2s ease',
  selectors: {
    '&:active': {
      cursor: 'grabbing',
    },
    '&:hover': {
      backgroundColor: cssVar('backgroundOverlayPanelColor'),
      borderColor: cssVar('primaryColor'),
      transform: 'translateY(-2px)',
      boxShadow: cssVar('popoverShadow'),
    },
  },
});

export const boardCardDragging = style({
  opacity: 0.35,
  transform: 'scale(0.96)',
  borderColor: cssVar('primaryColor'),
});

export const labelRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px',
  cursor: 'pointer',
  marginBottom: '2px',
});

export const labelPill = style({
  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease',
  display: 'inline-flex',
  alignItems: 'center',
  cursor: 'pointer',
  color: cssVar('pureWhite'),
  fontSize: '10px',
  fontWeight: 700,
  padding: '2px 6px',
  borderRadius: '4px',
  selectors: {
    '&:hover': {
      transform: 'scale(1.06)',
      filter: 'brightness(1.12)',
    },
  },
});

export const labelPillCompact = style({
  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease',
  display: 'inline-flex',
  alignItems: 'center',
  cursor: 'pointer',
  width: '36px',
  height: '6px',
  borderRadius: '3px',
  selectors: {
    '&:hover': {
      transform: 'scale(1.06)',
      filter: 'brightness(1.12)',
    },
  },
});

export const boardCardTitle = style({
  fontSize: '14px',
  color: cssVar('textPrimaryColor'),
  fontWeight: 500,
  lineHeight: 1.4,
  wordWrap: 'break-word',
});

export const boardCardBadgeRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  fontSize: '11px',
  color: cssVar('textSecondaryColor'),
  alignItems: 'center',
  marginTop: '4px',
});

export const boardCardBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 6px',
  borderRadius: '4px',
  backgroundColor: cssVar('backgroundSecondaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  color: cssVar('textSecondaryColor'),
});

export const boardCardBadgeDue = style({
  color: cssVar('errorColor'),
  borderColor: cssVar('errorColor'),
});

export const addBtn = style({
  backgroundColor: 'transparent',
  border: `1px dashed ${cssVar('borderColor')}`,
  borderRadius: '8px',
  color: cssVar('textSecondaryColor'),
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  padding: '8px 12px',
  textAlign: 'left',
  width: '100%',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
      borderColor: cssVar('primaryColor'),
      color: cssVar('textPrimaryColor'),
    },
  },
});

export const addColumnBtn = style([
  addBtn,
  {
    backgroundColor: cssVar('backgroundSecondaryColor'),
    backdropFilter: 'blur(8px)',
    color: cssVar('textPrimaryColor'),
    width: '280px',
    minWidth: '270px',
    height: '48px',
    fontWeight: 600,
    borderRadius: '12px',
    flexShrink: 0,
  },
]);

export const addColumnFormCard = style([
  boardCol,
  {
    height: 'auto',
    width: '280px',
    minWidth: '270px',
  },
]);

export const inlineForm = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  width: '100%',
});

export const inlineTextarea = style({
  width: '100%',
  minHeight: '56px',
  padding: '8px 10px',
  borderRadius: '8px',
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
  resize: 'none',
  fontSize: '14px',
  outline: 'none',
  color: cssVar('textPrimaryColor'),
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  selectors: {
    '&:focus': {
      borderColor: cssVar('primaryColor'),
    },
  },
});

export const inlineInput = style({
  width: '100%',
  padding: '8px 10px',
  borderRadius: '8px',
  border: `1px solid ${cssVar('borderColor')}`,
  backgroundColor: cssVar('backgroundPrimaryColor'),
  fontSize: '13px',
  outline: 'none',
  color: cssVar('textPrimaryColor'),
  boxSizing: 'border-box',
  selectors: {
    '&:focus': {
      borderColor: cssVar('primaryColor'),
    },
  },
});

export const inlineActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

export const btnSubmit = style({
  backgroundColor: cssVar('primaryColor'),
  color: cssVar('pureWhite'),
  border: 'none',
  borderRadius: '6px',
  padding: '6px 14px',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'opacity 0.15s ease',
  selectors: {
    '&:hover': {
      opacity: 0.9,
    },
  },
});

export const btnCancel = style({
  backgroundColor: 'transparent',
  border: 'none',
  fontSize: '16px',
  color: cssVar('textSecondaryColor'),
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '6px',
  transition: 'color 0.15s ease, background-color 0.15s ease',
  selectors: {
    '&:hover': {
      color: cssVar('textPrimaryColor'),
      backgroundColor: cssVar('hoverColor'),
    },
  },
});

export const tableViewWrapper = style({
  flex: 1,
  padding: '20px',
  overflow: 'auto',
  width: '100%',
  boxSizing: 'border-box',
});

export const boardTable = style({
  width: '100%',
  borderCollapse: 'collapse',
  backgroundColor: cssVar('backgroundSecondaryColor'),
  borderRadius: '12px',
  overflow: 'hidden',
  border: `1px solid ${cssVar('borderColor')}`,
  boxShadow: cssVar('buttonShadow'),
});

export const tableHeadCell = style({
  textAlign: 'left',
  padding: '12px 16px',
  fontSize: '12px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  color: cssVar('textSecondaryColor'),
  backgroundColor: cssVar('backgroundOverlayPanelColor'),
  borderBottom: `1px solid ${cssVar('borderColor')}`,
});

export const tableRow = style({
  cursor: 'pointer',
  borderBottom: `1px solid ${cssVar('borderColor')}`,
  transition: 'background-color 0.15s ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
    },
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const tableCell = style({
  padding: '12px 16px',
  fontSize: '13px',
  color: cssVar('textPrimaryColor'),
  verticalAlign: 'middle',
});

export const tableColumnBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  backgroundColor: cssVar('backgroundPrimaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  color: cssVar('textPrimaryColor'),
});

export const tableEmptyCell = style({
  padding: '32px 16px',
  textAlign: 'center',
  color: cssVar('textSecondaryColor'),
  fontSize: '14px',
});

export const customizeDrawer = style({
  position: 'absolute',
  top: '60px',
  right: '20px',
  width: '288px',
  backgroundColor: cssVar('backgroundOverlayPanelColor'),
  backdropFilter: 'blur(12px)',
  borderRadius: '12px',
  boxShadow: cssVar('popoverShadow'),
  border: `1px solid ${cssVar('borderColor')}`,
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  zIndex: 100,
  color: cssVar('textPrimaryColor'),
});

export const customizeHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: `1px solid ${cssVar('borderColor')}`,
  paddingBottom: '8px',
});

export const customizeTitle = style({
  fontWeight: 700,
  fontSize: '14px',
  color: cssVar('textPrimaryColor'),
});

export const customizeSectionLabel = style({
  fontSize: '12px',
  fontWeight: 600,
  color: cssVar('textSecondaryColor'),
  marginBottom: '8px',
});

export const customizeGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
});

export const wallpaperThumb = style({
  height: '48px',
  borderRadius: '8px',
  cursor: 'pointer',
  border: `2px solid ${cssVar('borderColor')}`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  display: 'flex',
  alignItems: 'flex-end',
  padding: '4px 6px',
  boxSizing: 'border-box',
  transition: 'transform 0.15s ease, border-color 0.15s ease',
  selectors: {
    '&:hover': {
      transform: 'scale(1.04)',
      borderColor: cssVar('primaryColor'),
    },
  },
});

export const wallpaperThumbActive = style({
  borderColor: cssVar('primaryColor'),
  boxShadow: `0 0 0 2px ${cssVar('hoverColor')}`,
});

export const wallpaperThumbLabel = style({
  fontSize: '10px',
  fontWeight: 600,
  color: cssVar('textPrimaryColor'),
  backgroundColor: cssVar('backgroundOverlayPanelColor'),
  padding: '1px 4px',
  borderRadius: '4px',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const uploadLabelBtn = style([
  btnSubmit,
  {
    fontSize: '12px',
    padding: '6px 10px',
    cursor: 'pointer',
    textAlign: 'center',
    display: 'block',
  },
]);

export const overlayRangeRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '12px',
  color: cssVar('textSecondaryColor'),
  marginBottom: '4px',
});

export const overlayRangeValue = style({
  color: cssVar('primaryColor'),
  fontWeight: 600,
});

export const overlayRangeInput = style({
  width: '100%',
  accentColor: cssVar('primaryColor'),
});

export const modalContent = style({
  backgroundColor: cssVarV2('layer/background/overlayPanel'),
  color: cssVarV2('text/primary'),
  borderRadius: '16px',
  padding: 0,
  maxHeight: '88vh',
  overflowY: 'auto',
});

export const modalHeader = style({
  padding: '20px 48px 12px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  borderBottom: `1px solid ${cssVar('borderColor')}`,
});

export const modalTitle = style({
  fontSize: '20px',
  fontWeight: 700,
  color: cssVar('textPrimaryColor'),
  border: '1px solid transparent',
  backgroundColor: 'transparent',
  width: '100%',
  padding: '4px 8px',
  borderRadius: '6px',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
    },
    '&:focus': {
      backgroundColor: cssVar('backgroundPrimaryColor'),
      borderColor: cssVar('primaryColor'),
      outline: 'none',
    },
  },
});

export const modalSubtitle = style({
  fontSize: '13px',
  color: cssVar('textSecondaryColor'),
  paddingLeft: '8px',
});

export const modalListHighlight = style({
  color: cssVar('primaryColor'),
  fontWeight: 600,
});

export const modalGrid = style({
  display: 'flex',
  padding: '20px',
  gap: '20px',
  flexWrap: 'wrap',
});

export const modalMain = style({
  flex: 1,
  minWidth: '280px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
});

export const modalSidebar = style({
  width: '190px',
  minWidth: '190px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
});

export const modalSectionTitle = style({
  fontSize: '14px',
  fontWeight: 700,
  color: cssVar('textPrimaryColor'),
  marginBottom: '10px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  letterSpacing: '-0.01em',
});

export const modalSectionBody = style({
  paddingLeft: '4px',
});

export const modalDescInput = style({
  width: '100%',
  minHeight: '110px',
  backgroundColor: cssVar('backgroundPrimaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: '8px',
  padding: '10px 14px',
  resize: 'vertical',
  fontSize: '14px',
  outline: 'none',
  color: cssVar('textPrimaryColor'),
  transition: 'border-color 0.15s ease',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  selectors: {
    '&:focus': {
      borderColor: cssVar('primaryColor'),
    },
  },
});

export const checklistBarContainer = style({
  width: '100%',
  height: '6px',
  backgroundColor: cssVar('backgroundSecondaryColor'),
  borderRadius: '3px',
  marginBottom: '12px',
  overflow: 'hidden',
});

export const checklistBarFill = style({
  height: '100%',
  backgroundColor: cssVar('primaryColor'),
  transition: 'width 0.2s ease',
});

export const checklistList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginBottom: '12px',
});

export const checklistItem = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 8px',
  borderRadius: '6px',
  backgroundColor: cssVar('backgroundSecondaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  transition: 'background-color 0.15s ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
    },
  },
});

export const checklistLabel = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: '10px',
  cursor: 'pointer',
  flex: 1,
  minWidth: 0,
});

export const checklistCheckbox = style({
  width: '16px',
  height: '16px',
  accentColor: cssVar('primaryColor'),
  flexShrink: 0,
  cursor: 'pointer',
});

export const checklistText = style({
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
  minWidth: 0,
  fontSize: '13px',
  color: cssVar('textPrimaryColor'),
  textAlign: 'left',
});

export const checklistTextCompleted = style([
  checklistText,
  {
    textDecoration: 'line-through',
    color: cssVar('textSecondaryColor'),
    opacity: 0.7,
  },
]);

export const checklistDeleteBtn = style({
  backgroundColor: 'transparent',
  border: 'none',
  color: cssVar('textSecondaryColor'),
  cursor: 'pointer',
  borderRadius: '6px',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  marginLeft: '12px',
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      color: cssVar('errorColor'),
      backgroundColor: cssVar('hoverColor'),
    },
  },
});

export const commentForm = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginBottom: '12px',
});

export const commentFormFooter = style({
  display: 'flex',
  justifyContent: 'flex-end',
});

export const commentList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
});

export const commentCard = style({
  backgroundColor: cssVar('backgroundSecondaryColor'),
  padding: '10px 12px',
  borderRadius: '8px',
  border: `1px solid ${cssVar('borderColor')}`,
});

export const commentMeta = style({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '12px',
  color: cssVar('textSecondaryColor'),
  marginBottom: '4px',
});

export const commentAuthor = style({
  fontWeight: 600,
  color: cssVar('primaryColor'),
});

export const commentBody = style({
  fontSize: '14px',
  color: cssVar('textPrimaryColor'),
});

export const sidebarSectionLabel = style({
  fontSize: '11px',
  fontWeight: 700,
  color: cssVar('textSecondaryColor'),
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  marginBottom: '6px',
});

export const labelsGrid = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
});

export const labelSwatch = style({
  width: '42px',
  height: '24px',
  borderRadius: '6px',
  cursor: 'pointer',
  border: '2px solid transparent',
  transition: 'all 0.15s ease',
});

export const labelSwatchSelected = style({
  borderColor: cssVar('textPrimaryColor'),
  transform: 'scale(1.05)',
});

export const dueDateGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
});

export const dueDateInput = style({
  backgroundColor: cssVar('backgroundPrimaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: '8px',
  color: cssVar('textPrimaryColor'),
  padding: '7px 10px',
  fontSize: '12px',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
  selectors: {
    '&:focus': {
      borderColor: cssVar('primaryColor'),
    },
  },
});

export const clearDateBtn = style({
  backgroundColor: cssVar('backgroundSecondaryColor'),
  border: `1px solid ${cssVar('borderColor')}`,
  color: cssVar('textSecondaryColor'),
  padding: '5px 10px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 600,
  transition: 'all 0.15s ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
      color: cssVar('textPrimaryColor'),
    },
  },
});

export const deleteCardBtn = style({
  backgroundColor: 'transparent',
  border: `1px solid ${cssVar('errorColor')}`,
  color: cssVar('errorColor'),
  padding: '8px 12px',
  borderRadius: '8px',
  cursor: 'pointer',
  width: '100%',
  fontWeight: 600,
  fontSize: '13px',
  textAlign: 'left',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'background-color 0.15s ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
    },
  },
});
