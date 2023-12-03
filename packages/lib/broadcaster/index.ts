import { BROWSING_CONTEXT_ID, RELEASE_ID } from '@bangle.io/config';
import { Emitter, EventMessage } from '@bangle.io/emitter';

import { logger } from './logger';

export type BroadcasterConfig<T extends EventMessage<any, any>> = {
  onMessage: (message: T) => void;
};

const channelName = 'bangle-io-broadcaster:' + RELEASE_ID;

type Message<T> = {
  sender: {
    id: string;
    timestamp: number;
  };
  payload: T;
};

export function createBroadcaster<T extends EventMessage<string, any>>(
  name: string,
) {
  logger.info(
    'using channelName',
    channelName,
    ' BROWSING_CONTEXT_ID',
    BROWSING_CONTEXT_ID,
  );

  const broadcastChannel = new BroadcastChannel(channelName + ':' + name);

  const seenMessages = new WeakSet<Message<T>['payload']['payload']>();
  const emitter = Emitter.create<T>({
    onDestroy() {
      broadcastChannel.close();
    },
  });

  emitter.onAll((message) => {
    if (typeof message.payload !== 'object') {
      throw new Error('Invalid message received. Must be an object.');
    }

    if (seenMessages.has(message.payload)) {
      return;
    }

    const broadcastMessage: Message<any> = {
      sender: {
        id: BROWSING_CONTEXT_ID,
        timestamp: Date.now(),
      },
      payload: message,
    };
    broadcastChannel.postMessage(broadcastMessage);
  });

  broadcastChannel.onmessage = (messageEvent) => {
    const message: Message<T> = messageEvent.data;
    if (message.sender.id === BROWSING_CONTEXT_ID) {
      return;
    }

    if (typeof message.payload.payload !== 'object') {
      throw new Error('Invalid message received. Must be an object.');
    }
    //
    seenMessages.add(message.payload.payload);
    emitter.emit(message.payload.event, message.payload.payload);
  };

  return emitter;
}
