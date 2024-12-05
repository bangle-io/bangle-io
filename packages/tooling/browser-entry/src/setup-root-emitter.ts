import { Emitter, type EventMessage } from '@bangle.io/emitter';
import type { Logger } from '@bangle.io/logger';
import { CROSS_TAB_EVENTS, RootEmitter } from '@bangle.io/root-emitter';

interface BroadcastMessage {
  senderId: string;
  data: EventMessage<string, unknown>;
  timestamp: number;
}

export function setupBroadcastChannel(
  broadcastChannelName: string,
  tabId: string,
  logger: Logger,
  abortSignal: AbortSignal,
) {
  const broadcastChannel = new BroadcastChannel(broadcastChannelName);
  const publisher = new Emitter();
  const subscriber = new Emitter();

  publisher.onAll((message) => {
    if (CROSS_TAB_EVENTS.includes(message.event)) {
      const broadcastMessage: BroadcastMessage = {
        senderId: tabId,
        data: message,
        timestamp: Date.now(),
      };
      logger.debug('post-cross-tab', message.event);
      broadcastChannel.postMessage(broadcastMessage);

      subscriber.emit(message.event, message.payload);
    } else {
      logger.debug('post', message.event);
      subscriber.emit(message.event, message.payload);
    }
  });

  broadcastChannel.onmessage = (messageEvent) => {
    const message = messageEvent.data as BroadcastMessage;
    if (!message) {
      logger.error('invalid message', message);
      return;
    }

    if (message.senderId === tabId) {
      return;
    }

    const { data, senderId } = message;
    if ((CROSS_TAB_EVENTS as string[]).includes(data.event)) {
      logger.debug(`received message ${senderId}`, data.event);
      subscriber.emit(data.event, data.payload);
    } else {
      logger.warn('rejected message', data);
    }
  };

  abortSignal.addEventListener(
    'abort',
    () => {
      broadcastChannel.close();
      publisher.destroy();
      subscriber.destroy();
    },
    { once: true },
  );

  return { publisher, subscriber, broadcastChannel };
}

export function setupRootEmitter(
  broadcastChannelName: string,
  tabId: string,
  _logger: Logger,
  abortSignal: AbortSignal,
): RootEmitter {
  const logger = _logger.child('broadcast');

  const pubSub =
    typeof BroadcastChannel !== 'undefined'
      ? setupBroadcastChannel(broadcastChannelName, tabId, logger, abortSignal)
      : undefined;

  return new RootEmitter({
    abortSignal,
    pubSub,
  });
}
