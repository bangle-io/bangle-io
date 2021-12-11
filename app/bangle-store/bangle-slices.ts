import { ApplicationStore, Slice } from '@bangle.io/create-store';
import { UiContextAction, uiSlice, UISliceState } from '@bangle.io/ui-context';
import { workerSlice } from '@bangle.io/worker-setup';

export type BangleActionTypes = UiContextAction;
export type BangleSliceTypes = UISliceState;

export function bangleStateSlices({
  onUpdate,
}: {
  onUpdate?: (store: ApplicationStore) => void;
}) {
  return [
    workerSlice(),
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
