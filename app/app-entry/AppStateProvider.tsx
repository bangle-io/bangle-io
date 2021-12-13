import * as Comlink from 'comlink';
import React, { useMemo } from 'react';

import {
  AppStateContext,
  BangleStoreContext,
} from '@bangle.io/app-state-context';
import { initializeBangleStore } from '@bangle.io/bangle-store';

const LOG = false;

const log = LOG ? console.log.bind(console, 'AppStateContext') : () => {};

export function AppStateProvider({
  bangleStore,
  bangleStoreChanged,
  children,
}: {
  bangleStoreChanged: number;
  bangleStore: ReturnType<typeof initializeBangleStore>;
  children: React.ReactNode;
}) {
  const value = useMemo(() => {
    return {
      storeChanged: bangleStoreChanged,
      store: bangleStore,
      //
    };
  }, [bangleStore, bangleStoreChanged]);

  return (
    <BangleStoreContext.Provider value={bangleStore}>
      <AppStateContext.Provider value={value}>
        {children}
      </AppStateContext.Provider>
    </BangleStoreContext.Provider>
  );
}
