import type { SliceBase } from './common';
import type { StoreState } from './state';

export function throwSliceStateNotFound(
  slice: SliceBase,
  appState: StoreState,
): never {
  throw new Error(`Slice "${slice.key.key}" not found in store "`);
}

export function throwSliceActionNotFound(
  slice: SliceBase,
  actionName: string,
): never {
  throw new Error(
    `Action "${actionName}" not found in slice "${slice.key.key}"`,
  );
}
