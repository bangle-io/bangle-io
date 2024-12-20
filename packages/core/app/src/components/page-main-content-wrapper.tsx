import { cx } from '@bangle.io/base-utils';
import { APP_MAIN_CONTENT_PADDING } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import { useAtomValue } from 'jotai';
import React from 'react';

export interface PageMainContentWrapperProps {
  children: React.ReactNode;
  /**
   * If true, apply padding to the main content, components like Editor
   * like to manage their own padding to show things like the drag handle
   */
  applyPadding?: boolean;
}

export function PageMainContentWrapper({
  children,
  applyPadding = true,
}: PageMainContentWrapperProps) {
  const coreServices = useCoreServices();

  const wideEditor = useAtomValue(coreServices.workbenchState.$wideEditor);
  return (
    <div
      className={cx(
        'B-app-main-content flex flex-1 flex-col gap-4',
        !wideEditor && 'max-w-screen-md',
        applyPadding && APP_MAIN_CONTENT_PADDING,
      )}
    >
      {children}
    </div>
  );
}
