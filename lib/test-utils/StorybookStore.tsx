import React, { useEffect, useState } from 'react';

import type { NsmStore } from '@bangle.io/shared-types';

import type { createBasicStore } from './create-basic-store';

export function StorybookStore({
  renderChildren,
  createStoreParams = {},
  onMount,
}: {
  renderChildren: (store: NsmStore) => React.ReactNode;
  onMount?: (store: NsmStore) => void;
  createStoreParams?: Omit<
    Parameters<typeof createBasicStore>[0],
    'onUpdate' | 'storageProvider' | 'useUISlice'
  >;
}) {
  const [counter, setCounter] = React.useState(0);
  const onMountRef = React.useRef(onMount);

  // const [store] = useState(() => {
  //   // const { store } = createBasicStore({
  //   //   ...createStoreParams,
  //   //   storageProvider: 'in-memory',
  //   //   useUISlice: true,
  //   //   onUpdate: () => {
  //   //     setCounter((c) => c + 1);
  //   //   },
  //   // });

  //   return store;
  // });

  // useEffect(() => {
  //   // onMountRef.current?.(store);
  // }, [store]);

  return (
    <div>
      {/* <TestStoreProvider bangleStore={store} bangleStoreChanged={counter}> */}
      {/* {renderChildren(store)} */}
      {/* </TestStoreProvider> */}
    </div>
  );
}
