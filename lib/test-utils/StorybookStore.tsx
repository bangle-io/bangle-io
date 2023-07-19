import React, { useEffect, useState } from 'react';

import type { BangleApplicationStore, NsmStore } from '@bangle.io/shared-types';

import { createBasicStore } from './create-basic-store';
import { TestStoreProvider } from './TestStoreProvider';

export function StorybookStore({
  renderChildren,
  createStoreParams = {},
  onMount,
}: {
  renderChildren: (store: BangleApplicationStore) => React.ReactNode;
  onMount?: (store: NsmStore) => void;
  createStoreParams?: Omit<
    Parameters<typeof createBasicStore>[0],
    'onUpdate' | 'storageProvider' | 'useUISlice'
  >;
}) {
  const [counter, setCounter] = React.useState(0);
  const onMountRef = React.useRef(onMount);

  const [store] = useState(() => {
    const { store } = createBasicStore({
      ...createStoreParams,
      storageProvider: 'in-memory',
      useUISlice: true,
      onUpdate: () => {
        setCounter((c) => c + 1);
      },
    });

    return store;
  });

  useEffect(() => {
    // @ts-expect-error TODOO fix this
    onMountRef.current?.(store);
  }, [store]);

  return (
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={counter}>
        {renderChildren(store)}
      </TestStoreProvider>
    </div>
  );
}
