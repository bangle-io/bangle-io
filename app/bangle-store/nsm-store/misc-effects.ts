import {
  HELP_FS_INDEX_WS_PATH,
  HELP_FS_WORKSPACE_NAME,
} from '@bangle.io/constants';
import { changeEffect } from '@bangle.io/nsm';
import {
  goToInvalidWorkspacePage,
  goToLocation,
  locationSetWsPath,
  nsmPageSlice,
  wsNameToPathname,
} from '@bangle.io/slice-page';
import { assertNonWorkerGlobalScope } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

assertNonWorkerGlobalScope();

const saveLastUsedWorkspaceEffect = changeEffect(
  'saveLastUsedWorkspaceEffect',
  {
    wsName: nsmPageSlice.pick((s) => s.wsName),
  },
  ({ wsName }) => {
    if (wsName) {
      lastWorkspaceUsed.save(wsName);
    }
  },
);

// redirects user to the index path if they are on `help-fs` workspace landing page.
const helpFsWorkspaceRedirectEffect = changeEffect(
  'helpFsWorkspaceRedirectEffect',
  {
    location: nsmPageSlice.pick((s) => s.location),
  },
  ({ location }, dispatch) => {
    if (location.pathname === wsNameToPathname(HELP_FS_WORKSPACE_NAME)) {
      dispatch(
        goToLocation({
          location: locationSetWsPath(
            location,
            HELP_FS_WORKSPACE_NAME,
            OpenedWsPaths.createEmpty().updatePrimaryWsPath(
              HELP_FS_INDEX_WS_PATH,
            ),
          ),
        }),
      );
    }
  },
);

// redirect user to the invalid workspace page if the primaryWsPath is not valid.
const invalidWsPathRedirectEffect = changeEffect(
  'invalidWsPathRedirectEffect',
  {
    rawPrimaryWsPath: nsmPageSlice.pick((s) => s.rawPrimaryWsPath),
    primaryWsPath: nsmPageSlice.pick((s) => s.primaryWsPath),
    wsName: nsmPageSlice.pick((s) => s.wsName),

    rawSecondaryWsPath: nsmPageSlice.pick((s) => s.rawSecondaryWsPath),
  },
  ({ wsName, rawPrimaryWsPath, primaryWsPath }, dispatch) => {
    if (!wsName) {
      return;
    }

    if (
      typeof rawPrimaryWsPath === 'string' &&
      primaryWsPath !== rawPrimaryWsPath
    ) {
      dispatch(
        goToInvalidWorkspacePage({
          invalidWsName: wsName,
          replace: true,
        }),
      );
    }
  },
);

export const miscEffects = [
  saveLastUsedWorkspaceEffect,
  helpFsWorkspaceRedirectEffect,
  invalidWsPathRedirectEffect,
];

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
