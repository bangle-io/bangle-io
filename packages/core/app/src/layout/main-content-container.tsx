import { cx } from '@bangle.io/base-utils';
import { APP_MAIN_CONTENT_PADDING } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import { useIsMobile } from '@bangle.io/ui-components';
import { useAtomValue } from 'jotai';
import React from 'react';

export interface PageContentContainerProps {
  children: React.ReactNode;
  /**
   * If true, apply standard padding. Components like Editor
   * often manage their own padding (e.g., for drag handles).
   * @default true
   */
  applyPadding?: boolean;
  /**
   * If true, constrain content based on the editor width preference.
   * Non-editor pages with their own layout should opt out.
   * @default true
   */
  respectEditorWidthPreference?: boolean;
  /**
   * Optional test id applied to the container, so tests can assert which page
   * is mounted (e.g. that a note move never bounces through ws-home).
   */
  testId?: string;
}

/**
 * A container for the main page content, handling responsive width and padding.
 */
export function PageContentContainer({
  children,
  applyPadding = true,
  respectEditorWidthPreference = true,
  testId,
}: PageContentContainerProps) {
  const coreServices = useCoreServices();
  const wideEditor = useAtomValue(coreServices.workbenchState.$wideEditor);
  const isMobile = useIsMobile();

  return (
    <main
      data-testid={testId}
      className={cx(
        'B-app-page-content flex min-w-0 flex-1 flex-col gap-4',
        respectEditorWidthPreference &&
          !isMobile &&
          !wideEditor &&
          'mx-auto w-full max-w-(--breakpoint-md)',
        applyPadding && APP_MAIN_CONTENT_PADDING,
      )}
    >
      {children}
    </main>
  );
}
