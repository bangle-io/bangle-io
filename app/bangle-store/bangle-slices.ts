import { ApplicationStore, Slice } from '@bangle.io/create-store';
import {
  EditorManagerAction,
  editorManagerSlice,
} from '@bangle.io/editor-manager-context';
import {
  getPageLifeCycle,
  pageSlice,
  PageSliceAction,
} from '@bangle.io/page-context';
import { UiContextAction, uiSlice } from '@bangle.io/ui-context';
import { workerSlice } from '@bangle.io/worker-setup';
import {
  WorkspaceContextAction,
  workspaceContextSlice,
} from '@bangle.io/workspace-context';

export type BangleActionTypes =
  | UiContextAction
  | PageSliceAction
  | EditorManagerAction
  | WorkspaceContextAction;

export type BangleSliceTypes = ReturnType<typeof bangleStateSlices>;

export function bangleStateSlices({
  onUpdate,
  onPageInactive,
}: {
  onUpdate?: (store: ApplicationStore) => void;
  onPageInactive: () => void;
}) {
  return [
    workerSlice(),
    pageSlice(),
    workspaceContextSlice(),
    uiSlice(),
    editorManagerSlice(),

    // keep this at the end
    new Slice({
      sideEffect: [
        () => {
          return {
            deferredUpdate(store) {
              onUpdate?.(store);
            },
          };
        },

        // monitor page life cycle
        () => {
          return {
            update(store, prevState) {
              const pageLifeCycle = getPageLifeCycle()(store.state);
              if (
                pageLifeCycle &&
                pageLifeCycle !== getPageLifeCycle()(prevState)
              ) {
                if (
                  ['passive', 'terminated', 'hidden'].includes(pageLifeCycle)
                ) {
                  onPageInactive();
                }
              }
            },
          };
        },
      ],
    }),
  ];
}
