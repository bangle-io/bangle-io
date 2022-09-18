import React, { useRef } from 'react';

import {
  BangleStoreChanged,
  BangleStoreContext,
} from '@bangle.io/bangle-store-context';
import type { ApplicationStore } from '@bangle.io/create-store';

export function TestStoreProvider({
  bangleStore,
  bangleStoreChanged,
  children,
}: {
  bangleStore: ApplicationStore;
  bangleStoreChanged: number;
  children: React.ReactNode;
}) {
  let res: React.ReactNode = children;

  return (
    <BangleStoreContext.Provider value={useRef(bangleStore)}>
      <BangleStoreChanged.Provider value={bangleStoreChanged}>
        {res}
      </BangleStoreChanged.Provider>
    </BangleStoreContext.Provider>
  );
}
