import { WorkspaceType } from '@bangle.io/constants';
import { ExtensionRegistry } from '@bangle.io/extension-registry';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { HelpFsStorageProvider } from '@bangle.io/storage';
import { isValidNoteWsPath, OpenedWsPaths } from '@bangle.io/ws-path';

import { WorkspaceSliceState } from './workspace-slice-state';

export function validateOpenedWsPaths(openedWsPath: OpenedWsPaths):
  | {
      valid: true;
    }
  | {
      invalidWsPath: string;
      valid: false;
    } {
  let invalidWsPath: string | undefined = undefined;

  openedWsPath.forEachWsPath((path) => {
    if (invalidWsPath || path == null) {
      return;
    }

    if (!isValidNoteWsPath(path)) {
      invalidWsPath = path;
    }
  });

  if (invalidWsPath) {
    return { valid: false, invalidWsPath: invalidWsPath };
  }

  return {
    valid: true,
  };
}

export function getPrevOpenedWsPathsFromSearch(
  search?: string,
): OpenedWsPaths | undefined {
  let searchParams = new URLSearchParams(search);
  let prev = searchParams.get('ws_paths');
  if (prev) {
    try {
      let openedWsPaths = OpenedWsPaths.createFromArray(JSON.parse(prev));
      return openedWsPaths;
    } catch (err) {
      return undefined;
    }
  }

  return undefined;
}

export function savePrevOpenedWsPathsToSearch(
  openedWsPaths: OpenedWsPaths,
  searchParams: URLSearchParams,
) {
  if (openedWsPaths.hasSomeOpenedWsPaths()) {
    searchParams.append('ws_paths', JSON.stringify(openedWsPaths.toArray()));
  }
}

export const getWsInfoIfNotDeleted = (
  wsName: string,
  workspacesInfo: Exclude<WorkspaceSliceState['workspacesInfo'], undefined>,
) => {
  const wsInfo = workspacesInfo[wsName];

  return wsInfo?.deleted ? undefined : wsInfo;
};

export function storageProviderFromExtensionRegistry(
  wsInfo: WorkspaceInfo,
  extensionRegistry: ExtensionRegistry,
) {
  if (wsInfo.type === WorkspaceType.helpfs) {
    return new HelpFsStorageProvider();
  }

  return extensionRegistry.getStorageProvider(wsInfo.type);
}
