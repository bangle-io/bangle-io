import type { WorkspaceInfo } from '@bangle.io/shared-types';

import { WorkspaceTypeHelp } from './workspace';

export const HELP_FS_WORKSPACE_NAME = 'bangle-help';
export const BANGLE_HOME_PATH = `/ws/${WorkspaceTypeHelp}`;
export const HELP_FS_INDEX_FILE_NAME = 'getting started.md';
export const HELP_FS_INDEX_WS_PATH = `${HELP_FS_WORKSPACE_NAME}:${HELP_FS_INDEX_FILE_NAME}`;
