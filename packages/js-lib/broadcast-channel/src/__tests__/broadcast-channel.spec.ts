import { Logger } from '@bangle.io/logger';
import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  type BroadcastMessage,
  MemoryBroadcastChannel,
  TypedBroadcastBus,
} from '../index';

vi.stubGlobal('BroadcastChannel', MemoryBroadcastChannel);

function makeTestLogger() {
  const mockLog = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return { logger: new Logger('', 'debug', mockLog as any), mockLog: mockLog };
}

describe('TypedBroadcastBus', () => {
  let busA: TypedBroadcastBus<string>;
  let busB: TypedBroadcastBus<string>;
  let loggerA: { debug: Mock<any>; error: Mock<any> };
  let loggerB: { debug: Mock<any>; error: Mock<any> };
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
    const msg = handler.mock.calls[0][0] as BroadcastMessage<string>;
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
    const msg = handler.mock.calls[0][0] as BroadcastMessage<string>;
    expect(msg.data).toBe('Hello');
    expect(msg.isSelf).toBe(true);

    controller.abort();
  });
});
