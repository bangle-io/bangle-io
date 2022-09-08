import type { BaseAction, Slice } from './app-state-slice';

// The functions in this provide helpful utilities for testing.

export function overrideSliceInit<SL, A extends BaseAction = any>(
  slice: Slice<SL, A>,
  initialState: (sliceState: SL) => SL,
): Slice<SL, A> {
  const sliceStateConfig = slice.spec.state;

  if (!sliceStateConfig) {
    throw new Error('Slice has no state config');
  }

  const originalInit = sliceStateConfig.init;

  sliceStateConfig.init = (
    ...args: Parameters<typeof originalInit>
  ): ReturnType<typeof originalInit> => {
    const originalInitialState = originalInit.apply(slice, args);

    return initialState(originalInitialState);
  };

  return slice;
}
