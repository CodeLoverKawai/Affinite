import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { createVar, style } from '@vanilla-extract/css';

import {
  navBodyStyle,
  navHeaderStyle,
  navStyle,
  navWrapperStyle,
} from './index.css';

export { navBodyStyle, navHeaderStyle, navStyle, navWrapperStyle };

export const sidebarWidthVar = createVar();

export const shellNavWrapper = style([
  navWrapperStyle,
  {
    width: sidebarWidthVar,
    color: cssVarV2('text/primary'),
  },
]);

export const fallback = style({
  padding: '4px 8px',
  height: '100%',
  overflow: 'clip',
});

export const fallbackHeader = style({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'row',
  gap: '8px',
  overflow: 'hidden',
  height: '42px',
});

export const fallbackCloseAction = style({
  width: '25px',
  height: '25px',
  borderRadius: '50%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: cssVarV2('icon/secondary'),
  backgroundColor: cssVar('hoverColor'),
  flexShrink: 0,
  fontSize: '14px',
  opacity: 0.6,
});

export const spacer = style({
  flex: 1,
});

export const fallbackBody = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '42px',
  marginTop: '42px',
});

export const fallbackGroupItems = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
});

export const fallbackItemHeader = style({
  transform: 'translateX(-10px)',
});
