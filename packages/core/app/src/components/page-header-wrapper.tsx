import React from 'react';

export interface PageHeaderProps {
  children: React.ReactNode;
}

export function PageHeaderWrapper({ children }: PageHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4">
      {children}
    </header>
  );
}
