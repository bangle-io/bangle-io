import { useDebugValue, useRef, useState } from 'react';
import useSyncExternalStoreExports from 'use-sync-external-store/shim';

import type { Slice } from '../vanilla/slice';
import type { Store } from '../vanilla/store';
import type { AnySlice } from '../vanilla/types';

const { useSyncExternalStore } = useSyncExternalStoreExports;

type InferData<T> = T extends Slice<any, infer TData, any> ? TData : never;

interface ReactAdapter<TSnapshot> {
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => TSnapshot;
}

export function createUseTrackSliceHook<TAllSliceName extends string = any>(
  store: Store<TAllSliceName>,
) {
  function useSlice<TSlice extends AnySlice>(sl: TSlice): InferData<TSlice> {
    const ref = useRef<InferData<TSlice>>();

    const [adapter] = useState(() => {
      const adapter: ReactAdapter<InferData<TSlice>> = {
        subscribe: (onStoreChange) => {
          const sliceEffect = store.effect((effectStore) => {
            const selectedData = sl.track(effectStore);
            ref.current = selectedData;

            onStoreChange();

            queueMicrotask(() => {
              if (effectStore._runInstance?._addTrackedCount === 0) {
                console.warn(
                  `You forgot to destructure/access the tracked field from ${sl.name}. This will not track any changes!.`,
                );
              }
            });
          });

          return () => {
            store.unregisterEffect(sliceEffect);
          };
        },
        getSnapshot: () => {
          return ref.current ?? sl.get(store.state);
        },
      };

      return adapter;
    });

    const data = useSyncExternalStore(adapter.subscribe, adapter.getSnapshot);

    useDebugValue(data);

    return data;
  }

  return useSlice;
}
