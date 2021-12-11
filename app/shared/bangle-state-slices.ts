import { ApplicationStore, Slice } from '@bangle.io/create-store';
import { UiContextAction, uiSlice, UISliceState } from '@bangle.io/ui-context';

export type BangleActionTypes = UiContextAction;
export type BangleSliceTypes = UISliceState;

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
