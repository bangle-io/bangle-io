// eslint-disable-next-line no-use-before-define
import React, { useEffect } from 'react';

import { RELEASE_ID } from '@bangle.io/config';
import {
  CORE_OPERATIONS_SERVICE_WORKER_DISMISS_UPDATE,
  CORE_OPERATIONS_SERVICE_WORKER_RELOAD,
} from '@bangle.io/constants';
import { useSerialOperationHandler } from '@bangle.io/serial-operation-context';
import { useUIManagerContext } from '@bangle.io/ui-context';
import { useLocalStorage } from '@bangle.io/utils';

import { useRegisterSW } from './use-sw';

const uid = 'new-version-' + RELEASE_ID;

export function SWReloadPrompt() {
  // replaced dynamically
  const [shownOfflineReady, updateShownOfflineReady] = useLocalStorage(
    'sw-show-offline',
    false,
  );
  const { dispatch } = useUIManagerContext();
  const { needRefresh, offlineReady, acceptPrompt, closePrompt } =
    useRegisterSW();
  useEffect(() => {
    if (offlineReady && !shownOfflineReady) {
      updateShownOfflineReady(true);
      dispatch({
        name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
        value: {
          uid: 'offline-' + RELEASE_ID,
          severity: 'info',
          content: 'Bangle.io is now offline ready.',
        },
      });
    }
  }, [shownOfflineReady, offlineReady, dispatch, updateShownOfflineReady]);

  useSerialOperationHandler(
    (sOperation) => {
      if (sOperation.name === CORE_OPERATIONS_SERVICE_WORKER_RELOAD) {
        dispatch({
          name: 'action::@bangle.io/ui-context:DISMISS_NOTIFICATION',
          value: {
            uid,
          },
        });
        acceptPrompt();

        return true;
      }
      if (sOperation.name === CORE_OPERATIONS_SERVICE_WORKER_DISMISS_UPDATE) {
        dispatch({
          name: 'action::@bangle.io/ui-context:DISMISS_NOTIFICATION',
          value: {
            uid,
          },
        });
        closePrompt();

        return true;
      }
      return false;
    },
    [acceptPrompt, dispatch, closePrompt],
  );

  useEffect(() => {
    if (needRefresh) {
      dispatch({
        name: 'action::@bangle.io/ui-context:SHOW_NOTIFICATION',
        value: {
          severity: 'info',
          uid,
          content: `📦 There is a new version of Bangle.io available, would you like to update?`,
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
        },
      });
    }
  }, [acceptPrompt, needRefresh, closePrompt, dispatch]);

  return null;
}
