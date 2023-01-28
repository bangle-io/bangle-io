import type { Slice } from './slice';
import type { SliceLike, State } from './state';

export function throwSliceStateNotFound(
  slice: SliceLike,
  appState: State,
): never {
  throw new Error(
    `Slice "${slice.key.key}" not found in store "${appState.storeName}"`,
  );
}

export function throwSliceActionNotFound(
  slice: SliceLike,
  actionName: string,
): never {
  throw new Error(
    `Action "${actionName}" not found in slice "${slice.key.key}"`,
  );
}
