import React from 'react';

export interface PageMainContentWrapperProps {
  children: React.ReactNode;
}

export function PageMainContentWrapper({
  children,
}: PageMainContentWrapperProps) {
  return (
    <div className="B-app-main-content flex flex-1 flex-col gap-4 p-4 pt-0">
      {children}
    </div>
  );
}
