import {
  ApplicationStore,
  Slice,
  SliceSideEffect,
} from '@bangle.io/create-store';
import {
  EditorManagerAction,
  editorManagerSlice,
} from '@bangle.io/editor-manager-context';
import { extensionRegistrySlice } from '@bangle.io/extension-registry';
import { naukarWorkerProxy } from '@bangle.io/naukar-proxy';
import {
  pageLifeCycleTransitionedTo,
  pageSlice,
  PageSliceAction,
} from '@bangle.io/page-context';
import type { WorkspaceSliceAction } from '@bangle.io/slice-workspace';
import { workspaceSlice } from '@bangle.io/slice-workspace';
import { workspacesSlice } from '@bangle.io/slice-workspaces-manager';
import { UiContextAction, uiSlice } from '@bangle.io/ui-context';
import { workerSlice } from '@bangle.io/worker-setup';

import { e2eHelpers } from './e2e-helpers';

export type BangleActionTypes =
  | UiContextAction
  | PageSliceAction
  | EditorManagerAction
  | WorkspaceSliceAction;

export type BangleSliceTypes = ReturnType<typeof bangleStateSlices>;

export function bangleStateSlices({
  onUpdate,
  onPageInactive,
  extensionSlices,
}: {
  onUpdate?: (store: ApplicationStore) => void;
  onPageInactive: () => void;
  extensionSlices: Slice<any>[];
}) {
  return [
    pageSlice(),
    workspacesSlice(),
    workerSlice(),
    extensionRegistrySlice(),
    workspaceSlice(),
    uiSlice(),
    editorManagerSlice(),

    ...extensionSlices,

    e2eHelpers(),
    // keep this at the end
    new Slice({
      sideEffect: [
        flushNaukarEffect,

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
              const didChange = pageLifeCycleTransitionedTo(
                ['passive', 'terminated', 'hidden'],
                prevState,
              )(store.state);

              if (didChange) {
                onPageInactive();
              }
            },
          };
        },
      ],
    }),
  ];
}

// TODO this can move to the worker's store
export const flushNaukarEffect: SliceSideEffect<any, any> = () => {
  return {
    update: (store, prevState) => {
      if (pageLifeCycleTransitionedTo('active', prevState)(store.state)) {
        naukarWorkerProxy.resetManager();
        return;
      }

      const pageTransitionedToInactive = pageLifeCycleTransitionedTo(
        ['passive', 'terminated', 'frozen', 'hidden'],
        prevState,
      )(store.state);

      if (pageTransitionedToInactive) {
        naukarWorkerProxy.flushDisk();
        return;
      }
    },
  };
};
