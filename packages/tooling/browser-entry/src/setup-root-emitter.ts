import { TypedBroadcastBus } from '@bangle.io/browser-utils';
import type { Logger } from '@bangle.io/logger';
import { Emitter, type EventMessage } from '@bangle.io/mini-js-utils';
import {
  CROSS_TAB_EVENTS,
  type CrossTabEvent,
  type CrossTabRootEvent,
  RootEmitter,
  type RootEventWireEnvelope,
  rootEventWireCodec,
} from '@bangle.io/root-emitter';

function isCrossTabEvent(event: string): event is CrossTabEvent {
  return CROSS_TAB_EVENTS.some((crossTabEvent) => crossTabEvent === event);
}

function isCrossTabRootEvent(
  event: EventMessage<string, unknown>,
): event is CrossTabRootEvent {
  return isCrossTabEvent(event.event);
}

export function setupCrossTabComms(
  broadcastChannelName: string,
  tabId: string,
  logger: Logger,
  abortSignal: AbortSignal,
) {
  const broadcastBus = new TypedBroadcastBus<
    RootEventWireEnvelope<CrossTabRootEvent>
  >({
    name: broadcastChannelName,
    senderId: tabId,
    logger: logger,
    signal: abortSignal,
  });

  const publisher = new Emitter();
  const subscriber = new Emitter();

  publisher.onAll((message) => {
    if (isCrossTabRootEvent(message)) {
      logger.debug('post-cross-tab', message.event);
      broadcastBus.send(rootEventWireCodec.encode(message));
    } else {
      logger.debug('post', message.event);
      subscriber.emit(message.event, message.payload);
    }
  });

  broadcastBus.subscribe((message) => {
    const event = rootEventWireCodec.decode(message.data);
    if (!event) {
      logger.warn('rejected cross-tab message');
      return;
    }

    logger.debug(`received message ${message.senderId}`, event.event);
    subscriber.emit(event.event, event.payload);
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
