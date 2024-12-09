import { cx } from '@bangle.io/base-utils';
import { useCoreServices } from '@bangle.io/context';
import { useAtomValue } from 'jotai';
import React from 'react';

export interface PageMainContentWrapperProps {
  children: React.ReactNode;
}

export function PageMainContentWrapper({
  children,
}: PageMainContentWrapperProps) {
  const coreServices = useCoreServices();

  const wideEditor = useAtomValue(coreServices.workbenchState.$wideEditor);
  return (
    <div
      className={cx(
        'B-app-main-content flex flex-1 flex-col gap-4 p-4 pt-0',
        !wideEditor && 'max-w-screen-md',
      )}
    >
      {children}
    </div>
  );
}
