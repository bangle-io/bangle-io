import { useEffect } from 'react';

import { APP_ENV, IS_PRODUCTION_APP_ENV } from '@bangle.io/config';
import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import { resolvePath } from '@bangle.io/ws-path';

export function useSetDocumentTitle() {
  const { wsName, openedWsPaths } = useWorkspaceContext();
  const { primaryWsPath } = openedWsPaths;

  useEffect(() => {
    if (wsName) {
      document.title = primaryWsPath
        ? `${resolvePath(primaryWsPath).fileName} - bangle.io`
        : `${wsName} - bangle.io`;
    } else {
      document.title = 'bangle.io';
    }

    if (!IS_PRODUCTION_APP_ENV) {
      document.title = APP_ENV + ':' + document.title;
    }
  }, [primaryWsPath, wsName]);
}
