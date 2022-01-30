// eslint-disable-next-line no-use-before-define
import React, { useEffect } from 'react';

import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import { RELEASE_ID } from '@bangle.io/config';
import {
  CORE_OPERATIONS_SERVICE_WORKER_DISMISS_UPDATE,
  CORE_OPERATIONS_SERVICE_WORKER_RELOAD,
} from '@bangle.io/constants';
import { useSerialOperationHandler } from '@bangle.io/serial-operation-context';
import {
  dismissNotification,
  showNotification,
} from '@bangle.io/slice-notification';
import { useLocalStorage } from '@bangle.io/utils';

import { useRegisterSW } from './use-sw';

const uid = 'new-version-' + RELEASE_ID;

export function SWReloadPrompt() {
  // replaced dynamically
  const [shownOfflineReady, updateShownOfflineReady] = useLocalStorage(
    'sw-show-offline',
    false,
  );
  const bangleStore = useBangleStoreContext();

  const { needRefresh, offlineReady, acceptPrompt, closePrompt } =
    useRegisterSW();
  useEffect(() => {
    if (offlineReady && !shownOfflineReady) {
      updateShownOfflineReady(true);
      showNotification({
        uid: 'offline-' + RELEASE_ID,
        severity: 'info',
        title: 'Bangle.io is now offline ready.',
      })(bangleStore.state, bangleStore.dispatch);
    }
  }, [shownOfflineReady, offlineReady, bangleStore, updateShownOfflineReady]);

  useSerialOperationHandler(
    (sOperation) => {
      if (sOperation.name === CORE_OPERATIONS_SERVICE_WORKER_RELOAD) {
        dismissNotification({
          uid,
        })(bangleStore.state, bangleStore.dispatch);
        acceptPrompt();

        return true;
      }
      if (sOperation.name === CORE_OPERATIONS_SERVICE_WORKER_DISMISS_UPDATE) {
        dismissNotification({
          uid,
        })(bangleStore.state, bangleStore.dispatch);
        closePrompt();
        return true;
      }
      return false;
    },
    [acceptPrompt, bangleStore, closePrompt],
  );

  useEffect(() => {
    if (needRefresh) {
      showNotification({
        severity: 'info',
        uid,
        title: '📦 Update available',
        content: `There is a new version of Bangle.io available, would you like to update?`,
        buttons: [
          {
            title: 'Update',
            hint: `Will reload the page with the newer version`,
            operation: CORE_OPERATIONS_SERVICE_WORKER_RELOAD,
          },
          {
            title: 'Later',
            hint: `Will reload the page with the newer version`,
            operation: CORE_OPERATIONS_SERVICE_WORKER_RELOAD,
          },
        ],
      })(bangleStore.state, bangleStore.dispatch);
    }
  }, [acceptPrompt, needRefresh, closePrompt, bangleStore]);

  return null;
}
