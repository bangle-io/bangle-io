// eslint-disable-next-line no-use-before-define
import { FRIENDLY_ID, RELEASE_ID } from 'config';
import React, { useEffect } from 'react';
import { TextButton } from 'ui-components';
import { useUIManagerContext } from 'ui-context';
import { useLocalStorage } from 'utils';

import { useRegisterSW } from './use-sw';

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
          content: <span>Bangle.io now offline ready.</span>,
        },
      });
    }
  }, [shownOfflineReady, offlineReady, dispatch, updateShownOfflineReady]);

  useEffect(() => {
    if (needRefresh) {
      const uid = 'new-version-' + RELEASE_ID;
      dispatch({
        type: 'UI/SHOW_NOTIFICATION',
        value: {
          severity: 'info',
          uid,
          content: (
            <span>
              📦 Hey there is a new version ({FRIENDLY_ID}) of bangle.io
              available, would you like to update ?
            </span>
          ),
          buttons: [
            <TextButton
              hintPos="left"
              className="ml-3"
              onClick={() => {
                closePrompt();
                dispatch({
                  type: 'UI/DISMISS_NOTIFICATION',
                  value: {
                    uid,
                  },
                });
              }}
              hint={`Will update whenever you restart bangle.io next time`}
            >
              Later
            </TextButton>,
            <TextButton
              hintPos="left"
              className="ml-3"
              onClick={() => {
                acceptPrompt();
                dispatch({
                  type: 'UI/DISMISS_NOTIFICATION',
                  value: {
                    uid,
                  },
                });
              }}
              hint={`Will reload the page with the newer version`}
            >
              Yes
            </TextButton>,
          ],
        },
      });
    }
  }, [acceptPrompt, needRefresh, closePrompt, dispatch]);

  return null;
}
