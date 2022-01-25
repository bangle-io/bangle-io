import type { WorkspaceInfo } from '@bangle.io/shared-types';

import { WorkspaceType } from './workspace';

export const HELP_FS_WORKSPACE_TYPE = 'helpfs';
export const HELP_FS_WORKSPACE_NAME = 'bangle-help';
export const HELP_FS_INDEX_FILE_NAME = 'getting started.md';
export const HELP_FS_INDEX_WS_PATH = `${HELP_FS_WORKSPACE_NAME}:${HELP_FS_INDEX_FILE_NAME}`;

let cachedHelpFs: WorkspaceInfo | undefined = undefined;

export const helpFSWorkspaceInfo = (): WorkspaceInfo => {
  if (!cachedHelpFs) {
    cachedHelpFs = {
      metadata: {
        allowLocalChanges: true,
      },
      name: HELP_FS_WORKSPACE_NAME,
      type: WorkspaceType.helpfs,
      lastModified: Date.now(),
    };
  }

  return cachedHelpFs;
};
