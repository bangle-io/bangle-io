import { Logger } from '@bangle.io/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type BroadcastMessage,
  MemoryBroadcastChannel,
  TypedBroadcastBus,
} from '../src/broadcast-channel'; // Adjusted import path

vi.stubGlobal('BroadcastChannel', MemoryBroadcastChannel);

function makeTestLogger() {
  const mockLog = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return { logger: new Logger('', 'debug', mockLog), mockLog };
}

describe('TypedBroadcastBus', () => {
  let busA: TypedBroadcastBus<string>;
  let busB: TypedBroadcastBus<string>;
  let loggerA: ReturnType<typeof makeTestLogger>['mockLog'];
  let loggerB: ReturnType<typeof makeTestLogger>['mockLog'];
  let controllerA: AbortController;
  let controllerB: AbortController;

  beforeEach(() => {
    const logA = makeTestLogger();
    const logB = makeTestLogger();
    loggerA = logA.mockLog;
    loggerB = logB.mockLog;

    controllerA = new AbortController();
    controllerB = new AbortController();

    busA = new TypedBroadcastBus({
      name: 'test-channel',
      senderId: 'senderA',
      logger: logA.logger,
      signal: controllerA.signal,
    });
    busB = new TypedBroadcastBus({
      name: 'test-channel',
      senderId: 'senderB',
      logger: logB.logger,
      signal: controllerB.signal,
    });
  });

  afterEach(() => {
    controllerA.abort();
    controllerB.abort();
  });

  it('should send and receive messages from others', () => {
    const handlerB = vi.fn();
    busB.subscribe(handlerB, new AbortController().signal);

    busA.send('Hello from A');
    expect(handlerB).toHaveBeenCalledTimes(1);
    const firstCallArg = handlerB.mock
      .calls?.[0]?.[0] as BroadcastMessage<string>;
    expect(firstCallArg.data).toBe('Hello from A');
    expect(firstCallArg.senderId).toBe('senderA');
    expect(firstCallArg.isSelf).toBe(false);
    expect(loggerA.debug).toHaveBeenCalledWith(
      expect.any(String),
      'sending message',
      expect.objectContaining({ data: 'Hello from A' }),
    );
    expect(loggerB.debug).toHaveBeenCalledWith(
      expect.any(String),
      'received message from senderA',
      expect.objectContaining({ data: 'Hello from A', isSelf: false }),
    );
  });

  it('should also receive messages from itself', () => {
    const handlerA = vi.fn();
    busA.subscribe(handlerA, new AbortController().signal);

    busA.send('Hello from A');
    expect(handlerA).toHaveBeenCalledTimes(1);
    const msg = handlerA.mock.calls?.[0]?.[0] as BroadcastMessage<string>;
    expect(msg.data).toBe('Hello from A');
    expect(msg.senderId).toBe('senderA');
    expect(msg.isSelf).toBe(true);
  });

  it('should allow multiple handlers and unsubscribing', () => {
    const handlerB1 = vi.fn();
    const handlerB2 = vi.fn();
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    busB.subscribe(handlerB1, controller1.signal);
    busB.subscribe(handlerB2, controller2.signal);

    busA.send('msg1');
    expect(handlerB1).toHaveBeenCalledTimes(1);
    expect(handlerB2).toHaveBeenCalledTimes(1);

    controller1.abort();
    busA.send('msg2');
    expect(handlerB1).toHaveBeenCalledTimes(1);
    expect(handlerB2).toHaveBeenCalledTimes(2);
  });

  it('should handle invalid messages gracefully', () => {
    busA._channel.postMessage({ invalid: 'data' });
    expect(loggerA.error).toHaveBeenCalled();
    expect(loggerB.error).toHaveBeenCalled();
    expect(loggerA.error).toHaveBeenCalledWith(
      expect.any(String),
      'Invalid message received',
      { invalid: 'data' },
    );
  });

  it('should dispose properly', () => {
    const handlerB = vi.fn();
    const controller1 = new AbortController();

    busB.subscribe(handlerB, controller1.signal);

    controllerA.abort();
    busA.send('Hello after dispose');
    expect(handlerB).toHaveBeenCalledTimes(0);
  });

  it('should cleanup properly when aborted', () => {
    const handlerB = vi.fn();
    const msgController = new AbortController();

    busB.subscribe(handlerB, msgController.signal);

    controllerB.abort(); // abort the bus B
    busA.send('Hello after abort');
    expect(handlerB).toHaveBeenCalledTimes(0);
  });

  it('should stay closed when constructed with an aborted lifetime', () => {
    const controller = new AbortController();
    controller.abort();
    const bus = new TypedBroadcastBus({
      name: 'test-channel',
      senderId: 'closed-sender',
      signal: controller.signal,
    });
    const observer = vi.fn();
    const closedHandler = vi.fn();
    busB.subscribe(observer, new AbortController().signal);
    bus.subscribe(closedHandler, new AbortController().signal);

    bus.send('should not be delivered');
    expect(observer).not.toHaveBeenCalled();

    busB.send('should not reach the closed bus');
    expect(closedHandler).not.toHaveBeenCalled();
  });

  it('should ignore subscriptions whose lifetime is already aborted', () => {
    const controller = new AbortController();
    controller.abort();
    const handler = vi.fn();

    busA.subscribe(handler, controller.signal);
    busA.send('Hello');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should isolate mutable payloads between memory-channel recipients', () => {
    type Payload = { nested: { value: string } };
    const controllerA = new AbortController();
    const controllerB = new AbortController();
    const controllerC = new AbortController();
    const payloadBusA = new TypedBroadcastBus<Payload>({
      name: 'payload-channel',
      senderId: 'payload-senderA',
      useMemoryChannel: true,
      signal: controllerA.signal,
    });
    const payloadBusB = new TypedBroadcastBus<Payload>({
      name: 'payload-channel',
      senderId: 'payload-senderB',
      useMemoryChannel: true,
      signal: controllerB.signal,
    });
    const busC = new TypedBroadcastBus<Payload>({
      name: 'payload-channel',
      senderId: 'payload-senderC',
      useMemoryChannel: true,
      signal: controllerC.signal,
    });
    const receivedByB: Payload[] = [];
    const receivedByC: Payload[] = [];
    payloadBusB.subscribe(
      (message) => receivedByB.push(message.data),
      new AbortController().signal,
    );
    busC.subscribe(
      (message) => receivedByC.push(message.data),
      new AbortController().signal,
    );

    const payload: Payload = { nested: { value: 'original' } };
    payloadBusA.send(payload);
    const firstB = receivedByB[0];
    const firstC = receivedByC[0];

    expect(firstB).toEqual(payload);
    expect(firstC).toEqual(payload);
    expect(firstB).not.toBe(firstC);
    if (!firstB || !firstC) {
      throw new Error('Expected both memory-channel recipients to run');
    }
    firstB.nested.value = 'mutated';
    expect(firstC.nested.value).toBe('original');
    controllerA.abort();
    controllerB.abort();
    controllerC.abort();
  });

  it('should reject non-cloneable memory-channel payloads', () => {
    const controller = new AbortController();
    const bus = new TypedBroadcastBus<() => void>({
      name: 'non-cloneable-payload-channel',
      senderId: 'sender',
      useMemoryChannel: true,
      signal: controller.signal,
    });

    expect(() => bus.send(() => undefined)).toThrowError(
      expect.objectContaining({ name: 'DataCloneError' }),
    );
    controller.abort();
  });

  it('should receive messages from self with native BroadcastChannel', () => {
    // Create a bus with native BroadcastChannel
    const controller = new AbortController();
    const bus = new TypedBroadcastBus({
      name: 'test-channel',
      senderId: 'sender',
      useMemoryChannel: false,
      signal: controller.signal,
    });

    const handler = vi.fn();
    bus.subscribe(handler, new AbortController().signal);

    bus.send('Hello');
    expect(handler).toHaveBeenCalledTimes(1);
    const msg = handler.mock?.calls?.[0]?.[0] as BroadcastMessage<string>;
    expect(msg.data).toBe('Hello');
    expect(msg.isSelf).toBe(true);

    controller.abort();
  });

  it('should receive messages from self with MemoryBroadcastChannel', () => {
    // Create a bus with MemoryBroadcastChannel
    const controller = new AbortController();
    const bus = new TypedBroadcastBus({
      name: 'test-channel',
      senderId: 'sender',
      useMemoryChannel: true,
      signal: controller.signal,
    });

    const handler = vi.fn();
    bus.subscribe(handler, new AbortController().signal);

    bus.send('Hello');
    expect(handler).toHaveBeenCalledTimes(1);
    const msg = handler.mock?.calls?.[0]?.[0] as BroadcastMessage<string>;
    expect(msg.data).toBe('Hello');
    expect(msg.isSelf).toBe(true);

    controller.abort();
  });
});
