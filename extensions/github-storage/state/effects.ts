import { nsmApi2 } from '@bangle.io/api';
import { SEVERITY } from '@bangle.io/constants';
import type { EffectCreator } from '@bangle.io/nsm-3';
import { cleanup, effect, ref } from '@bangle.io/nsm-3';
import type { WsPath } from '@bangle.io/shared-types';
import { generateUid } from '@bangle.io/utils';

import {
  getSyncInterval,
  GITHUB_STORAGE_PROVIDER_NAME,
  OPERATION_SHOW_CONFLICT_DIALOG,
} from '../common';
import {
  nsmGhSlice,
  resetGithubState,
  updateGithubDetails,
} from './github-storage-slice';
import { checkForConflicts, optimizeDatabaseOperation } from './operations';

const getWsPathToNotificationIdMapRef = ref<Map<WsPath, string>>(
  () => new Map(),
);

export const githubWorkspaceEffect = effect(
  async (store) => {
    const wsName = nsmApi2.workspace.trackWorkspaceName(store);

    if (!wsName) {
      return;
    }

    let destroyed = false;

    cleanup(store, () => {
      destroyed = true;
    });

    const wsInfo = await nsmApi2.workspace.readWorkspaceInfo(wsName);

    if (destroyed) {
      return;
    }

    const isGhWorkspace = wsInfo?.type === GITHUB_STORAGE_PROVIDER_NAME;

    const currentWsName = nsmApi2.workspace.workspaceState().wsName;

    const { githubWsName } = nsmGhSlice.get(store.state);

    // while being async check if the wsName is still the same
    if (currentWsName !== wsName) {
      return;
    }

    if (wsName === githubWsName) {
      return;
    }

    if (!isGhWorkspace && githubWsName !== undefined) {
      store.dispatch(resetGithubState());

      return;
    }

    if (isGhWorkspace && githubWsName === undefined) {
      store.dispatch(updateGithubDetails({ githubWsName: wsName }));

      return;
    }
  },
  {
    name: 'githubWorkspaceEffect',
  },
);

export const githubSyncEffect = effect(
  (store) => {
    const { githubWsName } = nsmGhSlice.track(store);
    void nsmApi2.workspace.trackPageLifeCycleState(store);

    if (!githubWsName) {
      return;
    }
    const abort = new AbortController();

    cleanup(store, () => {
      abort.abort();
    });

    store.dispatch(optimizeDatabaseOperation(false, abort.signal));
  },
  {
    name: 'githubSyncEffect',
  },
);

const githubPeriodSyncEffect = effect(
  (store) => {
    let abort = new AbortController();
    const intervalId = setInterval(() => {
      abort.abort();
      abort = new AbortController();
      const { githubWsName } = nsmGhSlice.get(store.state);
      const { isInactivePage } = nsmApi2.workspace.workspaceState();

      if (!githubWsName || isInactivePage) {
        return;
      }

      store.dispatch(optimizeDatabaseOperation(true, abort.signal));
    }, getSyncInterval());

    cleanup(store, () => {
      abort.abort();
      clearInterval(intervalId);
    });
  },
  {
    name: 'githubPeriodSyncEffect',
  },
);

const githubConflictIntervalEffect = effect(
  async (store) => {
    const intervalId = setInterval(() => {
      const { githubWsName } = nsmGhSlice.get(store.state);

      if (githubWsName && !nsmApi2.workspace.workspaceState().isInactivePage) {
        store.dispatch(checkForConflicts());

        return;
      }
    }, getSyncInterval());

    cleanup(store, () => {
      clearInterval(intervalId);
    });
  },
  {
    name: 'githubConflictIntervalEffect',
  },
);

const githubConflictEffect = effect(
  (store) => {
    void nsmApi2.workspace.trackPageLifeCycleState(store);

    const { githubWsName } = nsmGhSlice.track(store);

    if (!githubWsName) {
      return;
    }

    store.dispatch(checkForConflicts());
  },
  {
    name: 'githubConflictEffect',
  },
);

const githubSetConflictNotification = effect(
  (store) => {
    const wsPathToUidRef = getWsPathToNotificationIdMapRef(store);

    const { githubWsName, conflictedWsPaths } = nsmGhSlice.track(store);

    if (!githubWsName) {
      return;
    }

    for (const wsPath of conflictedWsPaths) {
      const uid = generateUid();

      nsmApi2.ui.setEditorIssue({
        uid,
        description: `There is a conflict with ${wsPath} on Github. Please resolve the conflict on Github and then click on the sync button to resolve the conflict.`,
        title: 'Encountered Conflict',
        severity: SEVERITY.WARNING,
        wsPath,
        serialOperation: OPERATION_SHOW_CONFLICT_DIALOG,
      });

      wsPathToUidRef.current.set(wsPath, uid);
    }

    // clear out the notifications for the paths that are no longer conflicted
    for (const [wsPath, uid] of wsPathToUidRef.current) {
      if (!conflictedWsPaths.includes(wsPath)) {
        nsmApi2.ui.clearEditorIssue(uid);
        wsPathToUidRef.current.delete(wsPath);
      }
    }
  },
  {
    name: 'githubSetConflictNotification',
  },
);

export const githubEffects: EffectCreator[] = [
  githubWorkspaceEffect,
  githubSyncEffect,
  githubPeriodSyncEffect,
  githubConflictIntervalEffect,
  githubConflictEffect,
  githubSetConflictNotification,
];
