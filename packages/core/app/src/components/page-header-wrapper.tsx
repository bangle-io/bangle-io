import { Sidebar } from '@bangle.io/ui-components';
import React from 'react';

export interface PageHeaderProps {
  children: React.ReactNode;
}

export function PageHeaderWrapper({ children }: PageHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4">
      <Sidebar.SidebarTrigger className="-ml-1" />
      {children}
    </header>
  );
}
