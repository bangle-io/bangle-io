import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import type { WsName } from '@bangle.io/shared-types';
import {
  goToLandingPage,
  goToWorkspaceAuthRoute as _goToWorkspaceAuthRoute,
  goToWorkspaceHome as _goToWorkspaceHome,
} from '@bangle.io/slice-page';
import {
  createWorkspace as _createWorkspace,
  deleteWorkspace as _deleteWorkspace,
  readAllWorkspacesInfo as _readAllWorkspacesInfo,
  readWorkspaceInfo as _readWorkspaceInfo,
} from '@bangle.io/workspace-info';
import type { OpenedWsPaths } from '@bangle.io/ws-path';

import { _internal_getStore } from './internals';

export function readAllWorkspacesInfo(opts?: { allowDeleted?: boolean }) {
  return _readAllWorkspacesInfo({
    allowDeleted: opts?.allowDeleted,
  });
}

export function readWorkspaceInfo(
  wsName: WsName,
  opts?: {
    allowDeleted?: boolean;
  },
) {
  return _readWorkspaceInfo(wsName, {
    allowDeleted: opts?.allowDeleted,
  });
}

export const goToWorkspaceAuthRoute = (
  wsName: WsName,
  error: string,
  openedWsPaths?: OpenedWsPaths,
) => {
  const store = _internal_getStore();

  store.dispatch(_goToWorkspaceAuthRoute(wsName, error, openedWsPaths));
};

export const createWorkspace = async (
  wsName: WsName,
  type: string,
  opts: Record<string, unknown>,
) => {
  await _createWorkspace(wsName, type, opts);

  const store = _internal_getStore();

  store.dispatch(_goToWorkspaceHome({ wsName }));
  await Promise.resolve();
};

export const deleteWorkspace = async (wsName: WsName) => {
  await _deleteWorkspace(wsName);

  const store = _internal_getStore();

  if (nsmSliceWorkspace.get(store.state).wsName === wsName) {
    store.dispatch(goToLandingPage({ replace: true }));
    await Promise.resolve();
  }
};
