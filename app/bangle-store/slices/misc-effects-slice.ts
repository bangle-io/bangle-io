import { Slice, SliceKey } from '@bangle.io/create-store';
import {
  WorkspaceSliceAction,
  workspaceSliceKey,
  WorkspaceSliceState,
} from '@bangle.io/slice-workspace';
import { assertNonWorkerGlobalScope } from '@bangle.io/utils';

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
  let lastSeenWsName: string | undefined;
  return {
    destroy() {},
    deferredUpdate(store) {
      const { wsName, error } =
        workspaceSliceKey.getSliceState(store.state) || {};
      if (wsName && wsName !== lastSeenWsName && !error) {
        lastSeenWsName = wsName;
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
