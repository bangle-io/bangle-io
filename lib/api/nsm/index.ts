import type { AnySliceWithName, StoreState, Transaction } from '@bangle.io/nsm';

import type { ApiSliceNames, ApiStoreDispatch } from '../internals';
import { getStore } from '../internals';

export * as editor from './editor';
export * as ui from './ui';
export * as workspace from './workspace';

// TODO in future they can define config on what they can dispatch or not
interface Config {
  empty?: void;
}

export function dispatcher(config: Config = {}): ApiStoreDispatch {
  return (tx) => {
    return getStore().dispatch(tx as Transaction<any, any>);
  };
}

export function resolveState<T extends AnySliceWithName<ApiSliceNames>, R>(
  picker: [T, (storeState: StoreState<any>) => R, any],
): R {
  const store = getStore();

  return picker[1](store.state);
}
