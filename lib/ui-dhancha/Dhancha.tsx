import './style.css';

import React, { ReactNode, useRef } from 'react';

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

  return (
    <div
      className={
        'b-ui-dhancha_container' + (widescreen ? ' bu_widescreen' : '')
      }
    >
      <div
        role="navigation"
        aria-label="Activity Bar"
        ref={activitybarRef}
        className={
          'b-ui-dhancha_activitybar' + (widescreen ? ' bu_widescreen' : '')
        }
      >
        {activitybar}
      </div>
      {widescreen && workspaceSidebar && (
        <header className="b-ui-dhancha_ws-sidebar">{workspaceSidebar}</header>
      )}

      <main
        className={
          'b-ui-dhancha_main-content' + (widescreen ? ' bu_widescreen' : '')
        }
      >
        {mainContent}
      </main>
      {widescreen && noteSidebar && (
        <aside className="b-ui-dhancha_note-sidebar">{noteSidebar}</aside>
      )}
    </div>
  );
}

export function MultiColumnMainContent({ children }: { children: ReactNode }) {
  return (
    <div className="b-ui-dhancha_multi-column-main-content">{children}</div>
  );
}
