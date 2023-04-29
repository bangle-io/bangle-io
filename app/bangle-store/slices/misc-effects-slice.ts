import { Slice, SliceKey } from '@bangle.io/create-store';
import { stopGap_setWsData } from '@bangle.io/nsm-slice-workspace/nsm-slice-workspace';
import type { NsmStore } from '@bangle.io/shared-types';
import type {
  WorkspaceSliceAction,
  WorkspaceSliceState,
} from '@bangle.io/slice-workspace';
import { workspaceSliceKey } from '@bangle.io/slice-workspace';
import { assertNonWorkerGlobalScope } from '@bangle.io/utils';

assertNonWorkerGlobalScope();

const miscEffectsKey = new SliceKey<WorkspaceSliceState, WorkspaceSliceAction>(
  'miscEffectsSlice',
);

export function miscEffectsSlice() {
  return new Slice({
    key: miscEffectsKey,
    sideEffect: [saveLastUsedWorkspaceEffect, syncNsmWorkspaceSlice],
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

// TODO remove this post migration
export const syncNsmWorkspaceSlice = miscEffectsKey.reactor(
  {
    wsName: workspaceSliceKey.select('wsName'),
    openedWsPaths: workspaceSliceKey.select('openedWsPaths'),
  },
  (_, __, { wsName, openedWsPaths }) => {
    const nsmStore: NsmStore = (window as any).nsmStore;

    nsmStore.dispatch(
      stopGap_setWsData({
        wsName: wsName,
        openedWsPaths: openedWsPaths,
      }),
    );
  },
);
