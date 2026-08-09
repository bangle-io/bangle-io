import { MemoryBroadcastChannel } from '@bangle.io/browser-utils';
import { Logger } from '@bangle.io/logger';
import type { CrossTabRootEvent, RootEvents } from '@bangle.io/root-emitter';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { setupCrossTabComms } from '../setup-root-emitter';

vi.stubGlobal('BroadcastChannel', MemoryBroadcastChannel);

const sender = { id: 'other-tab', tag: 'test' };

const validCrossTabEvents = [
  {
    event: 'event::file:update',
    payload: {
      type: 'file-rename',
      wsPath: 'notes:renamed.md',
      oldWsPath: 'notes:original.md',
      sender,
    },
  },
  {
    event: 'event::file:force-update',
    payload: { wsName: 'notes', sender },
  },
  {
    event: 'event::app:reload-ui',
    payload: { sender },
  },
  {
    event: 'event::app:build-presence',
    payload: {
      protocol: 1,
      buildId: 'build-42',
      builtAt: 1_700_000_000_000,
      reply: false,
      sender,
    },
  },
] as const satisfies readonly CrossTabRootEvent[];

interface TestSetup {
  pubSub: ReturnType<typeof setupCrossTabComms>;
  abortController: AbortController;
  logger: Logger;
  tabId: string;
}

let tabCounter = 0;
const activeAbortControllers: AbortController[] = [];

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
  activeAbortControllers.push(abortController);

  return { pubSub, abortController, logger, tabId };
}

function receive(setup: TestSetup, senderId: string, data: unknown): void {
  setup.pubSub.broadcastBus._channel.onmessage?.(
    new MessageEvent('message', {
      data: { senderId, data, timestamp: Date.now() },
    }),
  );
}

afterEach(() => {
  for (const abortController of activeAbortControllers.splice(0)) {
    abortController.abort();
  }
  vi.restoreAllMocks();
});

describe('setupCrossTabComms', () => {
  test.each(
    validCrossTabEvents,
  )('receives versioned $event messages from another tab', (event) => {
    const setup1 = setup();
    const subscriberSpy = vi.fn();
    setup1.pubSub.subscriber.on(event.event, subscriberSpy);

    receive(setup1, 'different-tab', { version: 1, ...event });

    expect(subscriberSpy).toHaveBeenCalledOnce();
    expect(subscriberSpy).toHaveBeenCalledWith(event.payload);
  });

  test.each(
    validCrossTabEvents,
  )('receives legacy $event messages from another tab', (event) => {
    const setup1 = setup();
    const subscriberSpy = vi.fn();
    setup1.pubSub.subscriber.on(event.event, subscriberSpy);

    receive(setup1, 'different-tab', event);

    expect(subscriberSpy).toHaveBeenCalledOnce();
    expect(subscriberSpy).toHaveBeenCalledWith(event.payload);
  });

  test('sends v1 envelopes that retain event and payload for legacy receivers', () => {
    const setup1 = setup();
    const event = validCrossTabEvents[0];
    const sendSpy = vi.spyOn(setup1.pubSub.broadcastBus, 'send');
    const subscriberSpy = vi.fn();
    setup1.pubSub.subscriber.on(event.event, subscriberSpy);

    setup1.pubSub.publisher.emit(event.event, event.payload);

    expect(sendSpy).toHaveBeenCalledWith({ version: 1, ...event });
    expect(subscriberSpy).toHaveBeenCalledOnce();
    expect(subscriberSpy).toHaveBeenCalledWith(event.payload);
  });

  test('delivers each cross-tab event once to the sender and another tab', () => {
    const senderSetup = setup();
    const receiverSetup = setup();
    const event = validCrossTabEvents[1];
    const senderSpy = vi.fn();
    const receiverSpy = vi.fn();
    senderSetup.pubSub.subscriber.on(event.event, senderSpy);
    receiverSetup.pubSub.subscriber.on(event.event, receiverSpy);

    senderSetup.pubSub.publisher.emit(event.event, event.payload);

    expect(senderSpy).toHaveBeenCalledOnce();
    expect(receiverSpy).toHaveBeenCalledOnce();
    expect(senderSpy).toHaveBeenCalledWith(event.payload);
    expect(receiverSpy).toHaveBeenCalledWith(event.payload);
  });

  test('preserves valid same-tab messages injected by the transport', () => {
    const setup1 = setup();
    const event = validCrossTabEvents[2];
    const subscriberSpy = vi.fn();
    setup1.pubSub.subscriber.on(event.event, subscriberSpy);

    receive(setup1, setup1.tabId, { version: 1, ...event });

    expect(subscriberSpy).toHaveBeenCalledOnce();
    expect(subscriberSpy).toHaveBeenCalledWith(event.payload);
  });

  test('does not broadcast local-only root events', () => {
    const setup1 = setup();
    const sendSpy = vi.spyOn(setup1.pubSub.broadcastBus, 'send');
    const subscriberSpy = vi.fn();
    const event: Extract<RootEvents, { event: 'event::editor:reload-editor' }> =
      {
        event: 'event::editor:reload-editor',
        payload: { wsName: 'notes', sender },
      };
    setup1.pubSub.subscriber.on(event.event, subscriberSpy);

    setup1.pubSub.publisher.emit(event.event, event.payload);

    expect(sendSpy).not.toHaveBeenCalled();
    expect(subscriberSpy).toHaveBeenCalledOnce();
    expect(subscriberSpy).toHaveBeenCalledWith(event.payload);
  });

  test.each([
    undefined,
    null,
    'not an object',
    [],
    { version: 2, ...validCrossTabEvents[0] },
    { version: '1', ...validCrossTabEvents[0] },
    Object.create({ version: 2, ...validCrossTabEvents[0] }),
    { version: 1, event: 'event::unknown', payload: {} },
    { version: 1, event: 'event::file:update', payload: {} },
    {
      version: 1,
      event: 'event::file:update',
      payload: {
        ...validCrossTabEvents[0].payload,
        type: 'unrecognized-file-event',
      },
    },
    {
      version: 1,
      event: 'event::file:update',
      payload: { ...validCrossTabEvents[0].payload, wsPath: '' },
    },
    {
      version: 1,
      event: 'event::file:update',
      payload: { ...validCrossTabEvents[0].payload, oldWsPath: 123 },
    },
    {
      version: 1,
      event: 'event::file:force-update',
      payload: { sender, wsName: 123 },
    },
    {
      version: 1,
      event: 'event::app:reload-ui',
      payload: { sender: { id: 123 } },
    },
    {
      version: 1,
      event: 'event::app:build-presence',
      payload: {
        ...validCrossTabEvents[3].payload,
        builtAt: Number.NaN,
      },
    },
    {
      event: 'event::app:build-presence',
      payload: { ...validCrossTabEvents[3].payload, protocol: 2 },
    },
    new Proxy(
      {},
      {
        get() {
          throw new Error('malformed frame');
        },
      },
    ),
  ])('drops malformed inbound frames without emitting: %#', (data) => {
    const setup1 = setup();
    const subscriberSpy = vi.fn();
    const warnSpy = vi
      .spyOn(setup1.logger, 'warn')
      .mockImplementation(() => undefined);
    setup1.pubSub.subscriber.on('event::file:update', subscriberSpy);

    expect(() => receive(setup1, 'different-tab', data)).not.toThrow();

    expect(subscriberSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  test('cleans up the emitters and transport subscriptions on abort', () => {
    const setup1 = setup();
    const destroyPublisherSpy = vi.spyOn(setup1.pubSub.publisher, 'destroy');
    const destroySubscriberSpy = vi.spyOn(setup1.pubSub.subscriber, 'destroy');
    const sendSpy = vi.spyOn(setup1.pubSub.broadcastBus, 'send');

    setup1.abortController.abort();
    setup1.pubSub.publisher.emit(
      validCrossTabEvents[0].event,
      validCrossTabEvents[0].payload,
    );

    expect(destroyPublisherSpy).toHaveBeenCalledOnce();
    expect(destroySubscriberSpy).toHaveBeenCalledOnce();
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
