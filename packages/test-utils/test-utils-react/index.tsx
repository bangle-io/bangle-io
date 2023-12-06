import { darkTheme, Provider } from '@adobe/react-spectrum';
import { Store } from '@nalanda/core';
import { StoreProvider } from '@nalanda/react';
import React from 'react';

import { Router } from '@bangle.io/app-routing';
import { slicePage } from '@bangle.io/slice-page';

export function ReactSpectrumProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider theme={darkTheme} colorScheme="dark">
      {children}
    </Provider>
  );
}
export function TestProvider({
  store,
  children,
  spectrumProvider = true,
  router = false,
}: {
  store: Store;
  children: React.ReactNode;
  spectrumProvider?: boolean;
  router?: boolean;
}): React.ReactNode {
  let inner = children;

  if (router) {
    if (!store.options.slices.includes(slicePage)) {
      throw new Error(
        `You need to add the slicePage to your store to use the "router" option`,
      );
    }

    inner = <Router>{children}</Router>;
  }

  if (store) {
    inner = <StoreProvider store={store}>{inner}</StoreProvider>;
  }

  if (spectrumProvider) {
    inner = (
      <Provider theme={darkTheme} colorScheme="dark">
        {inner}
      </Provider>
    );
  }

  return inner;
}
