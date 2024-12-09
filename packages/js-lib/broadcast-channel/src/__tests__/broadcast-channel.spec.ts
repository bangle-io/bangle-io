import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest';
import {
  MemoryBroadcastChannel,
  TypedBroadcastBus,
  type BroadcastMessage,
} from '../index';
import { Logger } from '@bangle.io/logger';

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

  beforeEach(() => {
    const logA = makeTestLogger();
    const logB = makeTestLogger();
    loggerA = logA.mockLog;
    loggerB = logB.mockLog;

    busA = new TypedBroadcastBus({
      name: 'test-channel',
      senderId: 'senderA',
      logger: logA.logger,
    });
    busB = new TypedBroadcastBus({
      name: 'test-channel',
      senderId: 'senderB',
      logger: logB.logger,
    });
  });

  afterEach(() => {
    busA.dispose();
    busB.dispose();
  });

  it('should send and receive messages', () => {
    const handlerB = vi.fn();
    busB.subscribe(handlerB, new AbortController().signal);

    busA.send('Hello from A');
    expect(handlerB).toHaveBeenCalledTimes(1);
    const firstCallArg = handlerB.mock
      .calls?.[0]?.[0] as BroadcastMessage<string>;
    expect(firstCallArg.data).toBe('Hello from A');
    expect(firstCallArg.senderId).toBe('senderA');
    expect(loggerA.debug).toHaveBeenCalledWith(
      expect.any(String),
      'sending message',
      expect.objectContaining({ data: 'Hello from A' }),
    );
    expect(loggerB.debug).toHaveBeenCalledWith(
      expect.any(String),
      'received message from senderA',
      expect.objectContaining({ data: 'Hello from A' }),
    );
  });

  it('should ignore messages from itself', () => {
    const handlerA = vi.fn();
    busA.subscribe(handlerA, new AbortController().signal);

    busA.send('Hello from A');
    expect(handlerA).not.toHaveBeenCalled();
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
    // Force an invalid message scenario
    busA._channel.postMessage({ invalid: 'data' });
    expect(loggerA.error).not.toHaveBeenCalled(); // Bus A won't receive this message
    expect(loggerB.error).toHaveBeenCalled(); // Bus B receives invalid message from A channel
  });

  it('should dispose properly', () => {
    const handlerB = vi.fn();
    const controller1 = new AbortController();

    busB.subscribe(handlerB, controller1.signal);

    busB.dispose();
    busA.send('Hello after dispose');
    expect(handlerB).toHaveBeenCalledTimes(0);
  });
});
