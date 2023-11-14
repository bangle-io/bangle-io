import { BROWSING_CONTEXT_ID, RELEASE_ID } from '@bangle.io/config';
import { Emitter, EventPayload } from '@bangle.io/emitter';

import { logger } from './logger';

export type BroadcasterConfig<T extends EventPayload<any, any>> = {
  onMessage: (message: T) => void;
};

const channelName = 'bangle-io-broadcaster:' + RELEASE_ID;

logger.info('using channelName', channelName);

type Message<T> = {
  sender: {
    id: string;
    timestamp: number;
  };
  payload: T;
};

export function createBroadcaster<T extends EventPayload<string, any>>() {
  const broadcastChannel = new BroadcastChannel(channelName);

  const emitter = Emitter.create<T>({
    onEmit: (message) => {
      const broadcastMessage: Message<T> = {
        sender: {
          id: BROWSING_CONTEXT_ID,
          timestamp: Date.now(),
        },
        payload: message,
      };
      broadcastChannel.postMessage(broadcastMessage);
    },
    onDestroy() {
      broadcastChannel.close();
    },
  });

  broadcastChannel.onmessage = (messageEvent) => {
    const message: Message<T> = messageEvent.data;
    if (message.sender.id === BROWSING_CONTEXT_ID) {
      return;
    }
    emitter.emit(message.payload.event, message.payload.payload);
  };

  return emitter;
}
