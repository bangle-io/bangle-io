import { Slice } from './app-state-slice';
import { SliceKey } from './slice-key';

/**
 * a helper method for creating a slice that stores values in the state that never change
 * @param staticState - the value to initialize with
 * @param key - optional slice key
 * @returns
 */
export function staticSlice<T>(
  staticState: T,
  key = new SliceKey<T, any, any>('staticSlice'),
) {
  return {
    key,
    slice: new Slice<T, any, any>({
      key,
      state: {
        init() {
          return staticState;
        },
      },
    }),
  };
}
