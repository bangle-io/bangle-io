import { ApplicationStore, Slice } from '@bangle.io/create-store';
import { pageSlice } from '@bangle.io/slice-page';

export type NaukarActionTypes = {
  name: string;
};
export type NaukarSliceTypes = ReturnType<typeof naukarStateSlices>;

export function naukarStateSlices({
  onUpdate,
}: {
  onUpdate?: (store: ApplicationStore) => void;
}) {
  return [
    pageSlice(),
    // keep this at the end
    new Slice({
      sideEffect() {
        return {
          deferredUpdate(store) {
            onUpdate?.(store);
          },
        };
      },
    }),
  ];
}
