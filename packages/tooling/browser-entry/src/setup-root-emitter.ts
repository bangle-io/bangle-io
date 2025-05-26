import { TypedBroadcastBus } from '@bangle.io/browser-utils';
import type { Logger } from '@bangle.io/logger';
import { Emitter, type EventMessage } from '@bangle.io/mini-js-utils';
import { CROSS_TAB_EVENTS, RootEmitter } from '@bangle.io/root-emitter';

export function setupCrossTabComms(
  broadcastChannelName: string,
  tabId: string,
  logger: Logger,
  abortSignal: AbortSignal,
) {
  const broadcastBus = new TypedBroadcastBus<EventMessage<string, unknown>>({
    name: broadcastChannelName,
    senderId: tabId,
    logger: logger,
    signal: abortSignal,
  });

  const publisher = new Emitter();
  const subscriber = new Emitter();

  publisher.onAll((message) => {
    if (CROSS_TAB_EVENTS.includes(message.event)) {
      logger.debug('post-cross-tab', message.event);
      broadcastBus.send(message);
    } else {
      logger.debug('post', message.event);
      subscriber.emit(message.event, message.payload);
    }
  });

  broadcastBus.subscribe((message) => {
    const { data } = message;
    if ((CROSS_TAB_EVENTS as string[]).includes(data.event)) {
      logger.debug(`received message ${message.senderId}`, data.event);
      subscriber.emit(data.event, data.payload);
    } else {
      logger.warn('rejected message', data);
    }
  }, abortSignal);

  abortSignal.addEventListener(
    'abort',
    () => {
      publisher.destroy();
      subscriber.destroy();
    },
    { once: true },
  );

  return { publisher, subscriber, broadcastBus };
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
      ? setupCrossTabComms(broadcastChannelName, tabId, logger, abortSignal)
      : undefined;

  return new RootEmitter({
    abortSignal,
    pubSub,
  });
}
