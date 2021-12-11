import { ApplicationStore, Slice } from '@bangle.io/create-store';
import { uiSlice } from '@bangle.io/ui-context';

export function bangleStateSlices({
  onUpdate,
}: {
  onUpdate?: (store: ApplicationStore) => void;
}) {
  return [
    uiSlice(),

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
