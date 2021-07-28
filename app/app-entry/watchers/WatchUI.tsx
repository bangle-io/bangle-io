import { TAB_ID } from 'config';
import { useEffect, useRef } from 'react';
import { useUIManagerContext } from 'ui-context';
import { useBroadcastChannel } from 'utils';

const CHANNEL_NAME = 'watch_ui';
const UI_THEME_CHANGED = 'UI_THEME_CHANGED';

const LOG = false;

const log = LOG ? console.log.bind(console, 'WatchUI') : () => {};

interface MessageType {
  type: typeof UI_THEME_CHANGED;
  tabName: string;
  payload: {
    theme: string;
  };
}

export function WatchUI() {
  const [lastMessage, broadcastMessage] =
    useBroadcastChannel<MessageType>(CHANNEL_NAME);
  const { theme, dispatch } = useUIManagerContext();
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    isFirstMountRef.current = false;
  }, []);

  useEffect(() => {
    if (lastMessage) {
      dispatch({
        type: 'UI/UPDATE_THEME',
        value: { theme: lastMessage.payload.theme },
      });
    }
  }, [dispatch, lastMessage]);

  useEffect(() => {
    if (!isFirstMountRef.current && theme) {
      broadcastMessage({
        type: UI_THEME_CHANGED,
        tabName: TAB_ID,
        payload: {
          theme,
        },
      });
    }
  }, [broadcastMessage, theme]);

  return null;
}
