import { BROWSING_CONTEXT_ID } from '@bangle.io/config';
import { Emitter, EventMessage } from '@bangle.io/emitter';

import { createBroadcaster } from '../index';

describe('createBroadcaster', () => {
  // Mock for BroadcastChannel
  const mockBroadcastChannel = {
    postMessage: jest.fn(),
    close: jest.fn(),
    onmessage: jest.fn(),
  };
  let originalBroadcastChannel: BroadcastChannel = (globalThis as any)
    .BroadcastChannel;

  beforeEach(() => {
    (globalThis as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);
  });

  afterEach(() => {
    jest.clearAllMocks();
    (globalThis as any).BroadcastChannel = originalBroadcastChannel;
  });

  test('posts messages to broadcast channel on emit', () => {
    const emitter =
      createBroadcaster<EventMessage<string, any>>('test-broadcaster');
    emitter.emit('testEvent', 'testData');

    expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
      sender: {
        id: BROWSING_CONTEXT_ID,
        timestamp: expect.any(Number),
      },
      payload: { event: 'testEvent', payload: 'testData' },
    });
  });

  test('emits messages received from broadcast channel', () => {
    const onMessageMock = jest.fn();
    const emitter =
      createBroadcaster<EventMessage<string, any>>('test-broadcaster');
    emitter.on('testEvent', onMessageMock);

    const mockMessage = {
      data: {
        sender: { id: 'different-context', timestamp: Date.now() },
        payload: { event: 'testEvent', payload: 'testData' },
      },
    };

    mockBroadcastChannel.onmessage(mockMessage);

    expect(onMessageMock).toHaveBeenCalledWith('testData');
  });

  test('ignores messages from the same browsing context', () => {
    const onMessageMock = jest.fn();
    const emitter =
      createBroadcaster<EventMessage<string, any>>('test-broadcaster');
    emitter.on('testEvent', onMessageMock);

    const mockMessage = {
      data: {
        sender: { id: BROWSING_CONTEXT_ID, timestamp: Date.now() },
        payload: { event: 'testEvent', payload: 'testData' },
      },
    };

    mockBroadcastChannel.onmessage(mockMessage);

    expect(onMessageMock).not.toHaveBeenCalled();
  });

  test('closes broadcast channel on destroy', () => {
    const emitter =
      createBroadcaster<EventMessage<string, any>>('test-broadcaster');
    emitter.destroy();

    expect(mockBroadcastChannel.close).toHaveBeenCalled();
  });
});
