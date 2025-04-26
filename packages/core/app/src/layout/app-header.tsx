import React from 'react';
import { AppToolbar } from './app-toolbar';

export interface AppHeaderProps {
  children?: React.ReactNode;
}

/** The main application header container, holding the AppToolbar and optional children. */
export function AppHeader({ children }: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4">
      <AppToolbar />
      {children}
    </header>
  );
}
