import { Emitter } from '@bangle.io/emitter';
import type { Command } from '@bangle.io/types';
import { expect, test } from 'vitest';
import { vi } from 'vitest';
import { RootEmitter } from '../index';

test('works', () => {
  expect(true).toBe(true);
});

test('RootEmitter should emit and receive events', () => {
  const abortController = new AbortController();
  const emitter = new RootEmitter({
    abortSignal: abortController.signal,
  });

  const listener = vi.fn();
  emitter.on('event::file:update', listener, abortController.signal);

  const payload = {
    wsPath: '/path/to/file',
    type: 'file-create' as const,
    sender: { id: 'sender1' },
  };
  emitter.emit('event::file:update', payload);

  expect(listener).toHaveBeenCalledWith(payload);
});

test('RootEmitter should handle multiple listeners for the same event', () => {
  const abortController = new AbortController();
  const emitter = new RootEmitter({
    abortSignal: abortController.signal,
  });

  const listener1 = vi.fn();
  const listener2 = vi.fn();
  emitter.on('event::workspace-info:update', listener1, abortController.signal);
  emitter.on('event::workspace-info:update', listener2, abortController.signal);

  const payload = {
    wsName: 'workspace1',
    type: 'workspace-create' as const,
    sender: { id: 'sender2' },
  };
  emitter.emit('event::workspace-info:update', payload);

  expect(listener1).toHaveBeenCalledWith(payload);
  expect(listener2).toHaveBeenCalledWith(payload);
});

test('Listeners should not be called after aborting signal', () => {
  const abortController = new AbortController();
  const emitter = new RootEmitter({
    abortSignal: abortController.signal,
  });

  const listener = vi.fn();
  emitter.on('event::command:result', listener, abortController.signal);

  abortController.abort();

  const command: Command = {
    id: 'command::ui:toggle-sidebar',
    args: null,
  };

  emitter.emit('event::command:result', {
    type: 'success',
    command: command,
    from: 'test',
  });

  expect(listener).not.toHaveBeenCalled();
});

test('RootEmitter defaults to wired publisher and subscriber when pubSub is not provided', () => {
  const abortController = new AbortController();
  const emitter = new RootEmitter({
    abortSignal: abortController.signal,
  });

  const listener = vi.fn();
  emitter.on('event::file:update', listener, abortController.signal);

  const payload = {
    wsPath: '/path/to/file',
    type: 'file-create' as const,
    sender: { id: 'sender1' },
  };
  emitter.emit('event::file:update', payload);

  expect(listener).toHaveBeenCalledWith(payload);
});

test('RootEmitter works correctly with custom pubSub provided', () => {
  const abortController = new AbortController();
  const customPublisher = new Emitter();
  const customSubscriber = new Emitter();

  // Wire custom publisher and subscriber
  customPublisher.onAll(({ event, payload }) => {
    customSubscriber.emit(event, payload);
  });

  const emitter = new RootEmitter({
    abortSignal: abortController.signal,
    pubSub: {
      publisher: customPublisher,
      subscriber: customSubscriber,
    },
  });

  const listener = vi.fn();
  emitter.on('event::file:update', listener, abortController.signal);

  const payload = {
    wsPath: '/path/to/file',
    type: 'file-create' as const,
    sender: { id: 'sender1' },
  };
  emitter.emit('event::file:update', payload);

  expect(listener).toHaveBeenCalledWith(payload);
});
