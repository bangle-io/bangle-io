import { HELP_FS_WORKSPACE_NAME } from '@bangle.io/constants';
import { Slice, SliceKey } from '@bangle.io/create-store';
import type {
  WorkspaceSliceAction,
  WorkspaceSliceState,
} from '@bangle.io/slice-workspace';
import { getWsName, workspaceSliceKey } from '@bangle.io/slice-workspace';
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
    deferredUpdate(store, prevState) {
      const { wsName, error } =
        workspaceSliceKey.getSliceState(store.state) || {};

      const prevWsName = getWsName()(prevState);

      if (error || wsName === HELP_FS_WORKSPACE_NAME) {
        return;
      }
      if (wsName && wsName !== lastSeenWsName) {
        lastSeenWsName = wsName;
        lastWorkspaceUsed.save(wsName);
      } else if (!wsName && prevWsName) {
        lastSeenWsName = undefined;
        lastWorkspaceUsed.clear();
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
