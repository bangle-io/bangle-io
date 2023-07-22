import { useEffect, useRef } from 'react';

import { useNsmSlice } from '@bangle.io/bangle-store-context';
import { TAB_ID } from '@bangle.io/config';
import type { ColorScheme } from '@bangle.io/constants';
import { nsmUI, nsmUISlice } from '@bangle.io/slice-ui';
import { useBroadcastChannel } from '@bangle.io/utils';

const CHANNEL_NAME = 'watch_ui';
const UI_THEME_CHANGED = 'UI_THEME_CHANGED';

const LOG = false;

const log = LOG ? console.log.bind(console, 'WatchUI') : () => {};

interface MessageType {
  type: typeof UI_THEME_CHANGED;
  tabName: string;
  payload: {
    colorScheme: ColorScheme;
  };
}

export function WatchUI() {
  const [lastMessage, broadcastMessage] =
    useBroadcastChannel<MessageType>(CHANNEL_NAME);

  const [{ colorScheme }, uiDispatch] = useNsmSlice(nsmUISlice);

  const isFirstMountRef = useRef(true);

  useEffect(() => {
    isFirstMountRef.current = false;
  }, []);

  useEffect(() => {
    if (lastMessage) {
      uiDispatch(nsmUI.updateColorSchema(lastMessage.payload.colorScheme));
    }
  }, [uiDispatch, lastMessage]);

  useEffect(() => {
    if (!isFirstMountRef.current && colorScheme) {
      broadcastMessage({
        type: UI_THEME_CHANGED,
        tabName: TAB_ID,
        payload: {
          colorScheme,
        },
      });
    }
  }, [broadcastMessage, colorScheme]);

  return null;
}
