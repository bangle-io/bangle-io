import './style.css';

import type { ReactNode } from 'react';
import React, { useRef } from 'react';

import { vars } from '@bangle.io/css-vars';

import { useStickyNavigation } from './use-sticky-navigation';

/**
 * Provides the base structure of the app.
 * Does not handle scrolling and setting max height, so it is recommended to set that up in child component.
 * @returns
 */
export function Dhancha({
  widescreen = true,
  activitybar,
  workspaceSidebar,
  mainContent,
  noteSidebar,
}: {
  widescreen: boolean;
  activitybar: ReactNode;
  workspaceSidebar?: ReactNode;
  mainContent?: ReactNode;
  noteSidebar?: ReactNode;
}) {
  const activitybarRef = useRef<HTMLDivElement>(null);

  useStickyNavigation(widescreen, activitybarRef);

  const mainChild = (
    <main
      className={
        'B-ui-dhancha_main-content' + (widescreen ? ' BU_widescreen' : '')
      }
    >
      {mainContent}
    </main>
  );

  let childContent;

  if (widescreen) {
    childContent = (
      <>
        {workspaceSidebar && (
          <header
            style={{
              width: vars.misc.workspaceSidebarWidth,
            }}
            className="z-5 flex-shrink-0 h-screen border-r-1 border-colorNeutralBorder"
          >
            {workspaceSidebar}
          </header>
        )}
        {mainChild}
      </>
    );
  }
  // if mobile either show wSidebar or mainChild
  else {
    childContent = <>{workspaceSidebar ? workspaceSidebar : mainChild}</>;
  }

  return (
    <div
      className={
        'B-ui-dhancha_container' + (widescreen ? ' BU_widescreen' : '')
      }
    >
      <div
        role="navigation"
        aria-label="Activity Bar"
        ref={activitybarRef}
        className={
          'B-ui-dhancha_activitybar' + (widescreen ? ' BU_widescreen' : '')
        }
      >
        {activitybar}
      </div>

      {childContent}

      {widescreen && noteSidebar && (
        <aside
          className="B-ui-dhancha_note-sidebar shrink-0 h-screen z-5 border-l-1 border-colorNeutralBorder"
          style={{
            width: vars.misc.noteSidebarWidth,
          }}
        >
          {noteSidebar}
        </aside>
      )}
    </div>
  );
}

export function MultiColumnMainContent({ children }: { children: ReactNode }) {
  return (
    <div className="B-ui-dhancha_multi-column-main-content">{children}</div>
  );
}
