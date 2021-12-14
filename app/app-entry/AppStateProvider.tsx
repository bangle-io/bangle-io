import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

import {
  BangleStoreChanged,
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
  const history = useHistory();

  useEffect(() => {
    // TODO there is a possibility that we miss a location
    // update before this is initialized
    const unlisten = history.listen((location) => {
      bangleStore.dispatch({
        name: 'action::workspace-context:update-location',
        value: {
          locationSearchQuery: location.search,
          locationPathname: location.pathname,
        },
      });
    });
    return () => {
      unlisten();
    };
  }, [bangleStore, history]);

  return (
    <BangleStoreContext.Provider value={bangleStore}>
      <BangleStoreChanged.Provider value={bangleStoreChanged}>
        {children}
      </BangleStoreChanged.Provider>
    </BangleStoreContext.Provider>
  );
}
