import { PageSliceAction } from '@bangle.io/constants';
import { ApplicationStore, Slice } from '@bangle.io/create-store';
import { UiContextAction, uiSlice } from '@bangle.io/ui-context';
import { workerSlice } from '@bangle.io/worker-setup';

import { pageSlice } from './page-slice';

export type BangleActionTypes = UiContextAction | PageSliceAction;
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
