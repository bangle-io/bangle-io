import { Emitter } from '@bangle.io/emitter';
import { expectType } from '@bangle.io/mini-js-utils';
import type { Command } from '@bangle.io/types';
import { describe, expect, test } from 'vitest';
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
  emitter.on('event::app:reload-ui', listener1, abortController.signal);
  emitter.on('event::app:reload-ui', listener2, abortController.signal);

  const payload = {
    wsName: 'workspace1',
    type: 'workspace-create' as const,
    sender: { id: 'sender2' },
  };
  emitter.emit('event::app:reload-ui', payload);

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

describe('ScopedEmitter', () => {
  test('should only allow specified events', () => {
    const abortController = new AbortController();
    const rootEmitter = new RootEmitter({
      abortSignal: abortController.signal,
    });

    const scopedEmitter = rootEmitter.scoped(
      ['event::file:update'],
      abortController.signal,
    );
    const listener = vi.fn();

    scopedEmitter.on('event::file:update', listener, abortController.signal);

    const payload = {
      wsPath: '/path/to/file',
      type: 'file-create' as const,
      sender: { id: 'sender1' },
    };

    scopedEmitter.emit('event::file:update', payload);
    expect(listener).toHaveBeenCalledWith(payload);

    expect(() => {
      scopedEmitter.emit(
        // @ts-expect-error - Should not allow events outside scope
        'event::app:reload-ui',
        {
          wsName: 'test',
          type: 'workspace-create',
          sender: { id: 'test' },
        },
      );
    }).toThrow();
  });

  test('should cleanup listeners when parent signal is aborted', () => {
    const abortController = new AbortController();
    const rootEmitter = new RootEmitter({
      abortSignal: abortController.signal,
    });

    const listener = vi.fn();
    const scopedEmitter = rootEmitter.scoped(
      ['event::file:update'],
      abortController.signal,
    );

    scopedEmitter.on('event::file:update', listener, abortController.signal);

    const payload = {
      wsPath: '/path/to/file',
      type: 'file-create' as const,
      sender: { id: 'sender1' },
    };

    scopedEmitter.emit('event::file:update', payload);
    expect(listener).toHaveBeenCalledWith(payload);

    abortController.abort();

    listener.mockClear();
    scopedEmitter.emit('event::file:update', payload);
    expect(listener).not.toHaveBeenCalled();
  });

  test('should cleanup listeners when scoped signal is aborted', () => {
    const rootAbortController = new AbortController();
    const scopedAbortController = new AbortController();

    const rootEmitter = new RootEmitter({
      abortSignal: rootAbortController.signal,
    });

    const listener = vi.fn();
    const scopedEmitter = rootEmitter.scoped(
      ['event::file:update'],
      scopedAbortController.signal,
    );

    scopedEmitter.on(
      'event::file:update',
      listener,
      scopedAbortController.signal,
    );

    const payload = {
      wsPath: '/path/to/file',
      type: 'file-create' as const,
      sender: { id: 'sender1' },
    };

    scopedEmitter.emit('event::file:update', payload);
    expect(listener).toHaveBeenCalledWith(payload);

    scopedAbortController.abort();

    listener.mockClear();
    scopedEmitter.emit('event::file:update', payload);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('types', () => {
  test('ScopedEmitter type safety', () => {
    const abortController = new AbortController();
    const rootEmitter = new RootEmitter({
      abortSignal: abortController.signal,
    });

    const scopedEmitter = rootEmitter.scoped(
      ['event::file:update'],
      abortController.signal,
    );

    scopedEmitter.on(
      'event::file:update',
      (data) => {
        expectType<string, typeof data.wsPath>(data.wsPath);
        expectType<
          'file-create' | 'file-content-update' | 'file-delete' | 'file-rename',
          typeof data.type
        >(data.type);
      },
      abortController.signal,
    );

    expect(() =>
      scopedEmitter.on(
        // @ts-expect-error - Should not allow events outside scope
        'event::app:reload-ui',
        () => {},
        abortController.signal,
      ),
    ).toThrowError();

    expect(() =>
      // @ts-expect-error - Should not allow invalid payload type
      scopedEmitter.emit('event::app:reload-ui', {}),
    ).toThrowError();

    scopedEmitter.emit('event::file:update', {
      // @ts-expect-error - Should not allow invalid payload type
      invalidField: 'test',
    });
  });
});
