import { ApplicationStore, Slice } from '@bangle.io/create-store';
import { UiContextAction, uiSlice, UISliceState } from '@bangle.io/ui-context';
import { workerSlice } from '@bangle.io/worker-setup';

import { PageAction, pageSlice } from './page-slice';

export type BangleActionTypes = UiContextAction | PageAction;
export type BangleSliceTypes = ReturnType<typeof bangleStateSlices>;

export function bangleStateSlices({
  onUpdate,
}: {
  onUpdate?: (store: ApplicationStore) => void;
}) {
  return [
    workerSlice(),
    pageSlice(),
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
