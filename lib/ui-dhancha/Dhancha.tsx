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

  const main = (
    <main
      className={
        'B-ui-dhancha_main-content' + (widescreen ? ' BU_widescreen' : '')
      }
    >
      {mainContent}
    </main>
  );

  let body;

  if (widescreen) {
    body = (
      <>
        {workspaceSidebar && (
          <header className="B-ui-dhancha_ws-sidebar">
            {workspaceSidebar}
          </header>
        )}
        {main}
        {noteSidebar && (
          <aside className="B-ui-dhancha_note-sidebar">{noteSidebar}</aside>
        )}
      </>
    );
  } else {
    if (workspaceSidebar || noteSidebar) {
      body = noteSidebar || workspaceSidebar;
    } else {
      body = main;
    }
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
      {body}
    </div>
  );
}

export function MultiColumnMainContent({ children }: { children: ReactNode }) {
  return (
    <div className="B-ui-dhancha_multi-column-main-content">{children}</div>
  );
}
