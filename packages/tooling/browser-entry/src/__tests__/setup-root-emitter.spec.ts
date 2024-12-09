import type { Emitter } from '@bangle.io/emitter';
import { Logger } from '@bangle.io/logger';
import { CROSS_TAB_EVENTS } from '@bangle.io/root-emitter';
import {
  MemoryBroadcastChannel,
  type TypedBroadcastBus,
} from '@bangle.io/broadcast-channel';
import { describe, expect, test, vi } from 'vitest';
import { setupCrossTabComms } from '../setup-root-emitter';

// Replace the global BroadcastChannel with our MemoryBroadcastChannel
vi.stubGlobal('BroadcastChannel', MemoryBroadcastChannel);

interface TestSetup {
  pubSub: {
    publisher: Emitter;
    subscriber: Emitter;
    broadcastBus: TypedBroadcastBus<any>;
  };
  abortController: AbortController;
  logger: Logger;
  tabId: string;
}

let tabCounter = 0;

function setup(): TestSetup {
  const abortController = new AbortController();
  const logger = new Logger('test');
  const tabId = `test-tab-id-${tabCounter++}`;
  const channelName = 'test-channel';

  const pubSub = setupCrossTabComms(
    channelName,
    tabId,
    logger,
    abortController.signal,
  );

  return {
    pubSub,
    abortController,
    logger,
    tabId,
  };
}

describe('setupCrossTabComms', () => {
  test('should emit cross-tab events to other tabs', () => {
    const setup1 = setup();
    const setup2 = setup();

    const subscriberSpy = vi.fn();

    setup1.pubSub.subscriber.on(CROSS_TAB_EVENTS[0], subscriberSpy);

    const testPayload = { test: 'data' };
    setup2.pubSub.publisher.emit(CROSS_TAB_EVENTS[0], testPayload);

    expect(subscriberSpy).toHaveBeenCalledWith(testPayload);
  });

  test('should receive cross-tab events from other tabs', () => {
    const setup1 = setup();
    const setup2 = setup();

    const subscriberSpy = vi.fn();

    setup1.pubSub.subscriber.on(CROSS_TAB_EVENTS[0], subscriberSpy);

    const testPayload = { test: 'data' };
    setup2.pubSub.publisher.emit(CROSS_TAB_EVENTS[0], testPayload);

    expect(subscriberSpy).toHaveBeenCalledWith(testPayload);
  });

  test('should ignore messages from same tab', () => {
    const { pubSub, tabId } = setup();

    const subscriberSpy = vi.fn();

    pubSub.subscriber.on(CROSS_TAB_EVENTS[0], subscriberSpy);

    // Simulate receiving a message from the same tab via broadcastChannel
    const testMessage = {
      senderId: tabId,
      data: {
        event: CROSS_TAB_EVENTS[0],
        payload: { test: 'data' },
      },
      timestamp: Date.now(),
    };

    pubSub.broadcastBus._channel.onmessage?.(
      new MessageEvent('message', { data: testMessage }),
    );

    expect(subscriberSpy).not.toHaveBeenCalled();
  });

  test('should cleanup resources on abort', () => {
    const { pubSub, abortController } = setup();
    const destroyPublisherSpy = vi.spyOn(pubSub.publisher, 'destroy');
    const destroySubscriberSpy = vi.spyOn(pubSub.subscriber, 'destroy');
    const disposeBroadcastChannelSpy = vi.spyOn(pubSub.broadcastBus, 'dispose');

    abortController.abort();

    expect(destroyPublisherSpy).toHaveBeenCalled();
    expect(destroySubscriberSpy).toHaveBeenCalled();
    expect(disposeBroadcastChannelSpy).toHaveBeenCalled();
  });

  test('should not broadcast non-cross-tab events', () => {
    const { pubSub } = setup();
    const sendSpy = vi.spyOn(pubSub.broadcastBus, 'send');
    const subscriberSpy = vi.fn();
    const regularEvent = 'regular-event';

    pubSub.subscriber.on(regularEvent, subscriberSpy);
    pubSub.publisher.emit(regularEvent, { test: 'data' });

    expect(sendSpy).not.toHaveBeenCalled();
    expect(subscriberSpy).toHaveBeenCalledTimes(1);
  });

  test('should broadcast cross-tab events via TypedBroadcastBus', () => {
    const { pubSub } = setup();
    const sendSpy = vi.spyOn(pubSub.broadcastBus, 'send');
    const subscriberSpy = vi.fn();

    pubSub.subscriber.on(CROSS_TAB_EVENTS[0], subscriberSpy);

    const testPayload = { test: 'data' };
    pubSub.publisher.emit(CROSS_TAB_EVENTS[0], testPayload);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith({
      event: CROSS_TAB_EVENTS[0],
      payload: testPayload,
    });

    expect(subscriberSpy).toHaveBeenCalledWith(testPayload);
  });

  test('should ignore messages not in CROSS_TAB_EVENTS', () => {
    const { pubSub } = setup();
    const subscriberSpy = vi.fn();

    pubSub.subscriber.on('some-other-event', subscriberSpy);

    const testMessage = {
      senderId: 'different-tab',
      data: {
        event: 'some-other-event',
        payload: { test: 'data' },
      },
      timestamp: Date.now(),
    };

    // Simulate receiving the message via broadcastChannel
    pubSub.broadcastBus.onmessage?.(
      new MessageEvent('message', { data: testMessage }),
    );

    expect(subscriberSpy).not.toHaveBeenCalled();
  });
});
