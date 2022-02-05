import {
  getWorkspaceInfoSync,
  getWorkspaceMetadata,
  getWsName,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';

import { GITHUB_STORAGE_PROVIDER_NAME } from './common';

export const readGithubTokenFromStore = () => {
  return workspaceSliceKey.queryOp((state) => {
    const wsName = getWsName()(state);

    if (wsName) {
      const wsInfo = getWorkspaceInfoSync(wsName)(state);

      if (wsInfo && wsInfo.type === GITHUB_STORAGE_PROVIDER_NAME) {
        let metadata = getWorkspaceMetadata(wsName)(state);
        return metadata?.githubToken as string | undefined;
      }
    }
    return undefined;
  });
};
