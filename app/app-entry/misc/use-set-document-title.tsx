import { useEffect } from 'react';

import { useNsmSliceState } from '@bangle.io/bangle-store-context';
import { APP_ENV, IS_PRODUCTION_APP_ENV } from '@bangle.io/config';
import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import { resolvePath } from '@bangle.io/ws-path';

export function useSetDocumentTitle() {
  const { wsName, openedWsPaths } = useNsmSliceState(nsmSliceWorkspace);
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
