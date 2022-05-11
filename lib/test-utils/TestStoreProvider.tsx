import React from 'react';

import {
  BangleStoreChanged,
  BangleStoreContext,
} from '@bangle.io/bangle-store-context';
import { ApplicationStore } from '@bangle.io/create-store';
import { WorkspaceContextProvider } from '@bangle.io/slice-workspace';

export function TestStoreProvider({
  bangleStore,
  bangleStoreChanged,
  children,
}: {
  bangleStore: ApplicationStore;
  bangleStoreChanged: number;
  children: React.ReactNode;
}) {
  return (
    <BangleStoreContext.Provider value={bangleStore}>
      <BangleStoreChanged.Provider value={bangleStoreChanged}>
        <WorkspaceContextProvider>{children}</WorkspaceContextProvider>
      </BangleStoreChanged.Provider>
    </BangleStoreContext.Provider>
  );
}
