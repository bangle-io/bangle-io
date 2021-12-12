import { ApplicationStore, Slice } from '@bangle.io/create-store';

export type NaukarActionTypes = {
  name: string;
};
export type NaukarSliceTypes = {};

export function naukarStateSlices({
  onUpdate,
}: {
  onUpdate?: (store: ApplicationStore) => void;
}) {
  return [
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
