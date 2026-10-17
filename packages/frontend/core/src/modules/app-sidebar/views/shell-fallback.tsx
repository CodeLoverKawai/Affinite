import { Skeleton } from '@affine/component';
import { useAppSettingHelper } from '@affine/core/components/hooks/affine/use-app-setting-helper';
import { useLiveData, useService } from '@toeverything/infra';
import { useMemo } from 'react';

import { AppSidebarService } from '../services/app-sidebar';
import * as styles from './fallback.css';
import {
  navBodyStyle,
  navHeaderStyle,
  navStyle,
  navWrapperStyle,
} from './index.css';

export function FallbackHeader() {
  return (
    <div className={styles.fallbackHeader}>
      <FallbackHeaderSkeleton />
    </div>
  );
}

export function FallbackHeaderSkeleton() {
  return (
    <>
      <Skeleton variant="rectangular" width={32} height={32} />
      <Skeleton variant="rectangular" width={150} height={32} flex={1} />
      <Skeleton variant="circular" width={25} height={25} />
    </>
  );
}

const randomWidth = () => {
  return Math.floor(Math.random() * 200) + 100;
};

const RandomBar = ({ className }: { className?: string }) => {
  const width = useMemo(() => randomWidth(), []);
  return (
    <Skeleton
      variant="rectangular"
      width={width}
      height={16}
      className={className}
    />
  );
};

const RandomBars = ({ count, header }: { count: number; header?: boolean }) => {
  return (
    <div className={styles.fallbackGroupItems}>
      {header ? (
        <Skeleton
          className={styles.fallbackItemHeader}
          variant="rectangular"
          width={50}
          height={16}
        />
      ) : null}
      {Array.from({ length: count }).map((_, index) => (
        // oxlint-disable-next-line eslint-plugin-react(no-array-index-key)
        <RandomBar key={index} />
      ))}
    </div>
  );
};

export const FallbackBody = () => {
  return (
    <div className={styles.fallbackBody}>
      <RandomBars count={3} />
      <RandomBars count={4} header />
      <RandomBars count={4} header />
      <RandomBars count={3} header />
    </div>
  );
};

/**
 * NOTE(@forehalo): this is a copy of [AppSidebarFallback] without [WorkspaceNavigator] which will introduce a lot useless dependencies for shell(tab bar)
 */
export const ShellAppSidebarFallback = () => {
  const appSidebarService = useService(AppSidebarService).sidebar;
  const width = useLiveData(appSidebarService.width$);
  const { appSettings } = useAppSettingHelper();
  const clientBorder = appSettings.clientBorder;

  return (
    <div
      style={{ width }}
      className={navWrapperStyle}
      data-has-border={!BUILD_CONFIG.isElectron && !clientBorder}
      data-open="true"
    >
      <nav className={navStyle}>
        {!BUILD_CONFIG.isElectron ? <div className={navHeaderStyle} /> : null}
        <div className={navBodyStyle}>
          <div className={styles.fallback}>
            <FallbackHeader />
            <FallbackBody />
          </div>
        </div>
      </nav>
    </div>
  );
};
