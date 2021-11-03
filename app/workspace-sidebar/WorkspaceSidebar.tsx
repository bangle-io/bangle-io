import React from 'react';

import type { SidebarType } from '@bangle.io/extension-registry';
import { ErrorBoundary } from '@bangle.io/ui-components';

export function WorkspaceSidebar({
  wsName,
  sidebar,
}: {
  wsName?: string;
  sidebar: SidebarType;
}) {
  return (
    <div className="flex flex-grow flex-col workspace-sidebar overflow-y-scroll h-screen">
      <div className="px-2 mt-2 font-bold">{sidebar.title}</div>
      <ErrorBoundary>
        <sidebar.ReactComponent />
      </ErrorBoundary>
    </div>
  );
}
