import { cx } from '@bangle.io/base-utils';
import { APP_MAIN_CONTENT_PADDING } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import { useAtomValue } from 'jotai';
import React from 'react';

export interface MainContentContainerProps {
  children: React.ReactNode;
  /**
   * If true, apply padding to the main content. Components like Editor
   * often manage their own padding (e.g., for drag handles).
   * @default true
   */
  applyPadding?: boolean;
}

/**
 * A container for the main page content, handling responsive width and padding.
 * This component replaces the previous PageMainContentWrapper.
 */
export function MainContentContainer({
  children,
  applyPadding = true,
}: MainContentContainerProps) {
  const coreServices = useCoreServices();
  const wideEditor = useAtomValue(coreServices.workbenchState.$wideEditor);

  return (
    <main
      className={cx(
        'B-app-main-content flex flex-1 flex-col gap-4',
        !wideEditor && 'mx-auto w-full max-w-screen-md',
        applyPadding && APP_MAIN_CONTENT_PADDING,
      )}
    >
      {children}
    </main>
  );
}
