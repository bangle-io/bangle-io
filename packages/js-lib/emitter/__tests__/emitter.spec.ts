import { expectType } from '@bangle.io/mini-js-utils';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { Emitter } from '../index';

describe('Emitter', () => {
  let emitter: Emitter;

  beforeEach(() => {
    emitter = new Emitter();
  });

  afterEach(() => {
    emitter.destroy();
  });

  test('should allow adding and emitting events', () => {
    const mockCallback = vi.fn();
    emitter.on('event', mockCallback);
    emitter.emit('event', 'test-data');
    expect(mockCallback).toHaveBeenCalledWith('test-data');
  });

  test('should allow removing specific event listeners', () => {
    const mockCallback = vi.fn();
    const off = emitter.on('event', mockCallback);
    off();
    emitter.emit('event', 'test-data');
    expect(mockCallback).not.toHaveBeenCalled();
  });

  test('should remove all events ', () => {
    const mockCallback = vi.fn();
    emitter.on('event', mockCallback);
    emitter.clearListeners();
    emitter.emit('event', 'test-data');
    expect(mockCallback).not.toHaveBeenCalled();
  });

  test('destroy method should remove all event listeners', () => {
    const mockCallback = vi.fn();
    emitter.on('event', mockCallback);
    emitter.destroy();
    emitter.emit('event', 'test-data');
    expect(mockCallback).not.toHaveBeenCalled();
  });

  test('should become no-op after destroy is called', () => {
    const mockCallback = vi.fn();

    // Add a listener and then destroy the emitter
    emitter.on('event', mockCallback);
    emitter.destroy();

    // Try emitting an event after destruction
    emitter.emit('event', 'test-data');

    // The callback should not be called since the emitter is destroyed
    expect(mockCallback).not.toHaveBeenCalled();

    // Try adding a new listener after destruction
    emitter.on('event', mockCallback);
    emitter.emit('event', 'test-data');

    // The callback should still not be called
    expect(mockCallback).not.toHaveBeenCalled();
  });

  test('should call multiple listeners for the same event', () => {
    const mockCallback1 = vi.fn();
    const mockCallback2 = vi.fn();

    emitter.on('event', mockCallback1);
    emitter.on('event', mockCallback2);
    emitter.emit('event', 'test-data');

    expect(mockCallback1).toHaveBeenCalledWith('test-data');
    expect(mockCallback2).toHaveBeenCalledWith('test-data');
  });

  test('emitting an event with no listeners should not cause errors', () => {
    expect(() => {
      emitter.emit('event', 'test-data');
    }).not.toThrow();
  });

  test('adding the same listener multiple times should not duplicate calls', () => {
    const mockCallback = vi.fn();

    emitter.on('event', mockCallback);
    emitter.on('event', mockCallback); // Add the same listener again
    emitter.emit('event', 'test-data');

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('should remove listener when signal is aborted', () => {
    const mockCallback = vi.fn();
    const controller = new AbortController();

    emitter.on('event', mockCallback, controller.signal);

    emitter.emit('event', 'test-data');
    expect(mockCallback).toHaveBeenCalledWith('test-data');

    controller.abort();

    emitter.emit('event', 'test-data');
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});

describe('types', () => {
  // Define a test type for events
  interface TestEvents {
    event1: string;
    event2: number;
  }
  test('works with types', () => {
    // Create an instance of Emitter
    const emitter = new Emitter<TestEvents>();

    emitter.onAll((data) => {
      switch (data.event) {
        case 'event1': {
          expectType<string, typeof data.payload>(data.payload);
          break;
        }
        case 'event2': {
          expectType<number, typeof data.payload>(data.payload);
          break;
        }
        default: {
          break;
        }
      }
    });

    emitter.on('event1', (data) => {
      expectType<string, typeof data>(data);
    });

    emitter.emit('event2', 42);

    emitter.emit('event1', 'hello world'); // Should be correct
    // @ts-expect-error - Should be incorrect
    emitter.emit('event2', 'this should cause a type error');

    expect(1).toBe(1);
  });

  test('emitting events with incorrect data types should cause type errors', () => {
    const emitter = new Emitter<TestEvents>();

    // @ts-expect-error - Should be incorrect
    emitter.emit('event1', 42); // Incorrect type

    // @ts-expect-error - Should be incorrect
    emitter.emit('event2', 'test'); // Incorrect type

    expect(1).toBe(1); // Placeholder assertion
  });
});

describe('Emitter with discriminated union', () => {
  type MyEvents =
    | { event: 'eventA'; payload: { foo: number } }
    | { event: 'eventB'; payload: { bar: string } };

  const setup = () => {
    const emitter = Emitter.create<MyEvents>();
    return { emitter };
  };

  test('should handle eventA correctly', () => {
    const { emitter } = setup();
    const mockCallback = vi.fn();
    emitter.on('eventA', mockCallback);

    emitter.emit('eventA', { foo: 123 });
    expect(mockCallback).toHaveBeenCalledWith({ foo: 123 });
  });

  test('should handle eventB correctly', () => {
    const { emitter } = setup();
    const mockCallback = vi.fn();
    emitter.on('eventB', mockCallback);

    emitter.emit('eventB', { bar: 'test' });
    expect(mockCallback).toHaveBeenCalledWith({ bar: 'test' });
  });

  test('should not call eventB callback when emitting eventA', () => {
    const { emitter } = setup();
    const mockCallbackA = vi.fn();
    const mockCallbackB = vi.fn();

    emitter.on('eventA', mockCallbackA);
    emitter.on('eventB', mockCallbackB);

    emitter.emit('eventA', { foo: 456 });
    expect(mockCallbackA).toHaveBeenCalledWith({ foo: 456 });
    expect(mockCallbackB).not.toHaveBeenCalled();
  });

  test('works with types', () => {
    // Create an instance of Emitter
    const emitter = Emitter.create<MyEvents>();

    // Test 'on' method with correct types
    emitter.on('eventA', (payload) => {
      // This should be correct, payload should be of type { foo: number }
      expect(payload.foo).toBeGreaterThan(0);
    });

    // Test 'emit' method with correct types
    emitter.emit('eventB', { bar: 'hello' });

    () => {
      // @ts-expect-error - Should be incorrect
      emitter.emit('eventA', { bar: 'this should cause a type error' });
    };

    () => {
      // @ts-expect-error - Should be incorrect
      emitter.emit('eventC', { foo: 123 });
    };
    expect(1).toBe(1); // Placeholder assertion to ensure the test runs
  });
});

describe('Emitter with onAll feature', () => {
  test('onEmit receives correct EventPayload', () => {
    const emitter = new Emitter();
    const onEmitMock = vi.fn();
    emitter.onAll(onEmitMock);

    const testData = { key: 'value' };
    emitter.emit('event', testData);
    expect(onEmitMock).toHaveBeenCalledWith({
      event: 'event',
      payload: testData,
    });

    emitter.emit('event2', testData);
    expect(onEmitMock).toHaveBeenCalledWith({
      event: 'event2',
      payload: testData,
    });
  });

  test('onEmit is not called after emitter is destroyed', () => {
    const emitter = new Emitter({});
    const onEmitMock = vi.fn();
    emitter.onAll(onEmitMock);

    emitter.destroy();
    emitter.emit('event', 'test-data');
    expect(onEmitMock).not.toHaveBeenCalled();
  });
});

describe('Emitter onAll', () => {
  let emitter: Emitter;

  beforeEach(() => {
    emitter = new Emitter();
  });

  test('should add a listener via onAll', () => {
    const listener = vi.fn();
    emitter.onAll(listener);
    emitter.emit('testEvent', 'testData');
    expect(listener).toHaveBeenCalledWith({
      event: 'testEvent',
      payload: 'testData',
    });
  });

  test('should call all listeners added via onAll', () => {
    const firstListener = vi.fn();
    const secondListener = vi.fn();
    emitter.onAll(firstListener);
    emitter.onAll(secondListener);
    emitter.emit('testEvent', 'testData');
    expect(firstListener).toHaveBeenCalledWith({
      event: 'testEvent',
      payload: 'testData',
    });
    expect(secondListener).toHaveBeenCalledWith({
      event: 'testEvent',
      payload: 'testData',
    });
  });

  test('should remove a listener when its removal function is called', () => {
    const listener = vi.fn();
    const removeListener = emitter.onAll(listener);
    removeListener();
    emitter.emit('testEvent', 'testData');
    expect(listener).not.toHaveBeenCalled();
  });

  test('should not execute callback after listener is removed', () => {
    const listener = vi.fn();
    emitter.onAll(listener);
    const removeListener = emitter.onAll(() => {});
    removeListener();
    emitter.emit('testEvent', 'testData');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('should not add listeners after destroy is called', () => {
    emitter.destroy();
    const listener = vi.fn();
    emitter.onAll(listener);
    emitter.emit('testEvent', 'testData');
    expect(listener).not.toHaveBeenCalled();
  });

  test('clearListeners should remove all event and global listeners', () => {
    const eventListener = vi.fn();
    const allEventListener = vi.fn();

    // Add a specific event listener and a global listener
    emitter.on('specificEvent', eventListener);
    emitter.onAll(allEventListener);

    // Emit events to ensure listeners are initially called
    emitter.emit('specificEvent', 'dataForSpecificEvent');
    emitter.emit('anotherEvent', 'dataForAnotherEvent');

    expect(eventListener).toHaveBeenCalledTimes(1);
    expect(allEventListener).toHaveBeenCalledTimes(2);

    // Clear all listeners and emit events again
    emitter.clearListeners();
    expect(emitter._eventListeners).toEqual({});
    expect(emitter._allEventListeners.size).toBe(0);

    emitter.emit('specificEvent', 'dataForSpecificEvent');
    emitter.emit('anotherEvent', 'dataForAnotherEvent');

    // Listeners should not be called again after clearListeners
    expect(eventListener).toHaveBeenCalledTimes(1);
    expect(allEventListener).toHaveBeenCalledTimes(2);
  });

  test('destroy should remove all event and global listeners', () => {
    const eventListener = vi.fn();
    const allEventListener = vi.fn();

    // Add a specific event listener and a global listener
    emitter.on('specificEvent', eventListener);
    emitter.onAll(allEventListener);

    // Emit events to ensure listeners are initially called
    emitter.emit('specificEvent', 'dataForSpecificEvent');
    emitter.emit('anotherEvent', 'dataForAnotherEvent');

    expect(eventListener).toHaveBeenCalledTimes(1);
    expect(allEventListener).toHaveBeenCalledTimes(2);

    // Clear all listeners and emit events again
    emitter.destroy();
    expect(emitter._eventListeners).toEqual({});
    expect(emitter._allEventListeners.size).toBe(0);

    emitter.emit('specificEvent', 'dataForSpecificEvent');
    emitter.emit('anotherEvent', 'dataForAnotherEvent');

    // Listeners should not be called again after clearListeners
    expect(eventListener).toHaveBeenCalledTimes(1);
    expect(allEventListener).toHaveBeenCalledTimes(2);
  });
});
