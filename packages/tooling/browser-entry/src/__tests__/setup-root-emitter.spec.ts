import type { Emitter } from '@bangle.io/emitter';
// test/setupBroadcastChannel.test.ts
import { Logger } from '@bangle.io/logger';
import { CROSS_TAB_EVENTS } from '@bangle.io/root-emitter';
import { describe, expect, test, vi } from 'vitest';
import { setupBroadcastChannel } from '../setup-root-emitter';

class MockBroadcastChannel {
  onmessage: ((event: MessageEvent) => void) | null = null;
  private static channels: Map<string, Set<MockBroadcastChannel>> = new Map();
  private closed = false;

  constructor(public channelName: string) {
    if (!MockBroadcastChannel.channels.has(channelName)) {
      MockBroadcastChannel.channels.set(channelName, new Set());
    }
    MockBroadcastChannel.channels.get(channelName)?.add(this);
  }

  postMessage(data: unknown) {
    if (this.closed) return;

    const event = new MessageEvent('message', { data });
    const channels = MockBroadcastChannel.channels.get(this.channelName);

    if (channels) {
      for (const channel of channels) {
        if (channel !== this && !channel.closed) {
          if (channel.onmessage) {
            channel.onmessage(event);
          }
        }
      }
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    const channels = MockBroadcastChannel.channels.get(this.channelName);
    if (channels) {
      channels.delete(this);
      if (channels.size === 0) {
        MockBroadcastChannel.channels.delete(this.channelName);
      }
    }
    this.onmessage = null;
  }
}

// Replace the global BroadcastChannel with our mock
vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

interface TestSetup {
  broadcastChannel: MockBroadcastChannel;
  pubSub: {
    publisher: Emitter;
    subscriber: Emitter;
    broadcastChannel: BroadcastChannel;
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

  const pubSub = setupBroadcastChannel(
    channelName,
    tabId,
    logger,
    abortController.signal,
  );

  return {
    broadcastChannel:
      pubSub.broadcastChannel as unknown as MockBroadcastChannel,
    pubSub,
    abortController,
    logger,
    tabId,
  };
}

describe('setupBroadcastChannel', () => {
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
    const { pubSub, broadcastChannel, tabId } = setup();

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

    broadcastChannel.onmessage?.(
      new MessageEvent('message', { data: testMessage }),
    );

    expect(subscriberSpy).not.toHaveBeenCalled();
  });

  test('should cleanup resources on abort', () => {
    const { pubSub, abortController, broadcastChannel } = setup();
    const destroyPublisherSpy = vi.spyOn(pubSub.publisher, 'destroy');
    const destroySubscriberSpy = vi.spyOn(pubSub.subscriber, 'destroy');
    const closeBroadcastChannelSpy = vi.spyOn(broadcastChannel, 'close');

    abortController.abort();

    expect(destroyPublisherSpy).toHaveBeenCalled();
    expect(destroySubscriberSpy).toHaveBeenCalled();
    expect(closeBroadcastChannelSpy).toHaveBeenCalled();
  });

  test('should not broadcast non-cross-tab events', () => {
    const { pubSub, broadcastChannel } = setup();
    const postMessageSpy = vi.spyOn(broadcastChannel, 'postMessage');
    const subscriberSpy = vi.fn();
    const regularEvent = 'regular-event';

    pubSub.subscriber.on(regularEvent, subscriberSpy);
    pubSub.publisher.emit(regularEvent, { test: 'data' });

    expect(postMessageSpy).not.toHaveBeenCalled();
    expect(subscriberSpy).toHaveBeenCalledTimes(1);
  });

  test('should broadcast cross-tab events via BroadcastChannel', () => {
    const { pubSub, broadcastChannel } = setup();
    const postMessageSpy = vi.spyOn(broadcastChannel, 'postMessage');
    const subscriberSpy = vi.fn();

    pubSub.subscriber.on(CROSS_TAB_EVENTS[0], subscriberSpy);

    const testPayload = { test: 'data' };
    pubSub.publisher.emit(CROSS_TAB_EVENTS[0], testPayload);

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    expect(postMessageSpy).toHaveBeenCalledWith({
      senderId: expect.any(String),
      data: {
        event: CROSS_TAB_EVENTS[0],
        payload: testPayload,
      },
      timestamp: expect.any(Number),
    });

    expect(subscriberSpy).toHaveBeenCalledWith(testPayload);
  });

  test('should ignore messages not in CROSS_TAB_EVENTS', () => {
    const { pubSub, broadcastChannel } = setup();
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
    broadcastChannel.onmessage?.(
      new MessageEvent('message', { data: testMessage }),
    );

    expect(subscriberSpy).not.toHaveBeenCalled();
  });
});
