// eslint-disable-next-line no-use-before-define
import React, { useEffect } from 'react';

import { useActionHandler } from '@bangle.io/action-context';
import { RELEASE_ID } from '@bangle.io/config';
import {
  CORE_ACTIONS_SERVICE_WORKER_DISMISS_UPDATE,
  CORE_ACTIONS_SERVICE_WORKER_RELOAD,
} from '@bangle.io/constants';
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
        type: 'UI/SHOW_NOTIFICATION',
        value: {
          uid: 'offline-' + RELEASE_ID,
          severity: 'info',
          content: 'Bangle.io is now offline ready.',
        },
      });
    }
  }, [shownOfflineReady, offlineReady, dispatch, updateShownOfflineReady]);

  useActionHandler(
    (action) => {
      if (action.name === CORE_ACTIONS_SERVICE_WORKER_RELOAD) {
        dispatch({
          type: 'UI/DISMISS_NOTIFICATION',
          value: {
            uid,
          },
        });
        acceptPrompt();

        return true;
      }
      if (action.name === CORE_ACTIONS_SERVICE_WORKER_DISMISS_UPDATE) {
        dispatch({
          type: 'UI/DISMISS_NOTIFICATION',
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
        type: 'UI/SHOW_NOTIFICATION',
        value: {
          severity: 'info',
          uid,
          content: `📦 There is a new version of Bangle.io available, would you like to update?`,
          buttons: [
            {
              title: 'Update',
              hint: `Will reload the page with the newer version`,
              action: CORE_ACTIONS_SERVICE_WORKER_RELOAD,
            },
            {
              title: 'Later',
              hint: `Will reload the page with the newer version`,
              action: CORE_ACTIONS_SERVICE_WORKER_RELOAD,
            },
          ],
        },
      });
    }
  }, [acceptPrompt, needRefresh, closePrompt, dispatch]);

  return null;
}
