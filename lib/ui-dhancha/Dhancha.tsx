import './style.css';

import React, { ReactNode, useEffect, useMemo, useRef } from 'react';

import { setupStickyNavigation } from './use-sticky-navigation';

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

  useEffect(() => {
    let callback: undefined | (() => void);
    if (!widescreen && activitybarRef.current) {
      callback = setupStickyNavigation(activitybarRef.current);
    }
    return () => {
      callback?.();
    };
  }, [widescreen]);

  return (
    <div className={'ui-dhancha_container' + (widescreen ? ' widescreen' : '')}>
      <div
        role="navigation"
        aria-label="Activity Bar"
        ref={activitybarRef}
        className={'ui-dhancha_activitybar' + (widescreen ? ' widescreen' : '')}
      >
        {activitybar}
      </div>
      {widescreen && workspaceSidebar && (
        <header className="ui-dhancha_ws-sidebar">{workspaceSidebar}</header>
      )}

      <main
        className={
          'ui-dhancha_main-content' + (widescreen ? ' widescreen' : '')
        }
      >
        {mainContent}
      </main>
      {widescreen && noteSidebar && (
        <aside className="ui-dhancha_note-sidebar">{noteSidebar}</aside>
      )}
    </div>
  );
}

export function MultiColumnMainContent({ children }: { children: ReactNode }) {
  return <div className="ui-dhancha_multi-column-main-content">{children}</div>;
}
