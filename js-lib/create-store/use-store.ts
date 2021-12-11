import { useEffect, useState } from 'react';

import { createStore, Dispatch } from './create-store';

// Instead of using useReducer, this exists to reuse
// createStore.
export function useStore<S, I extends S, A>(
  rootReducer: (state: S, action: A) => S,
  initialArg: I,
  initialize?: (initArg: I) => S,
): [S, Dispatch<A>] {
  const [store] = useState(() => {
    return createStore(rootReducer, initialArg, initialize);
  });
  const [, updateCounter] = useState(0);

  useEffect(() => {
    store.subscribe(() => {
      updateCounter((r) => r + 1);
    });
    return () => {
      store.destroy();
    };
  }, [store]);

  return [store.getState(), store.dispatch];
}
