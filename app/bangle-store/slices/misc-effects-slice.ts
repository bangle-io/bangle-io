import { Slice, SliceKey } from '@bangle.io/create-store';
import { setWsPaths } from '@bangle.io/nsm-slice-workspace';
import type { NsmStore } from '@bangle.io/shared-types';
import type {
  WorkspaceSliceAction,
  WorkspaceSliceState,
} from '@bangle.io/slice-workspace';
import { workspaceSliceKey } from '@bangle.io/slice-workspace';
import { assertNonWorkerGlobalScope } from '@bangle.io/utils';
import { createWsName } from '@bangle.io/ws-path';

assertNonWorkerGlobalScope();

const miscEffectsKey = new SliceKey<WorkspaceSliceState, WorkspaceSliceAction>(
  'miscEffectsSlice',
);

export function miscEffectsSlice() {
  return new Slice({
    key: miscEffectsKey,
    sideEffect: [saveLastUsedWorkspaceEffect],
  });
}

export const saveLastUsedWorkspaceEffect = miscEffectsKey.effect(() => {
  return {
    destroy() {},
    deferredUpdate(store, prevState) {
      const wsName = workspaceSliceKey.getValueIfChanged(
        'wsName',
        store.state,
        prevState,
      );

      if (wsName) {
        lastWorkspaceUsed.save(wsName);
      }
    },
  };
});

// TODO change this key as it reflects an old key
const lastWorkspaceUsedKey = 'workspace-context/last-workspace-used';
export const lastWorkspaceUsed = {
  save: (wsName: string): void => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(lastWorkspaceUsedKey, wsName);
  },
  clear() {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(lastWorkspaceUsedKey);
  },
  get: (): string | undefined => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const result = window.localStorage.getItem(lastWorkspaceUsedKey);

    if (result && typeof result === 'string') {
      return result;
    }

    return undefined;
  },
};

// TODO remove this
const key = new SliceKey('syncToNewNsmWorkspaceSlice');
export function syncToNewNsmWorkspaceSlice() {
  return new Slice({
    key: key,
    sideEffect: [
      key.reactor(
        {
          wsPaths: workspaceSliceKey.select('wsPaths'),
          wsName: workspaceSliceKey.select('wsName'),
        },
        (_, __, { wsPaths, wsName }) => {
          // TODO remove this
          const nsmStore: NsmStore = (window as any).globalNsmStore;

          if (wsName) {
            nsmStore.dispatch(
              setWsPaths({ wsPaths, wsName: createWsName(wsName) }),
            );
          }
        },
      ),
    ],
  });
}
