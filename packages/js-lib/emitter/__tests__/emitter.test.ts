import { expectType } from '@bangle.io/mini-js-utils';

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
    const mockCallback = jest.fn();
    emitter.on('event', mockCallback);
    emitter.emit('event', 'test-data');
    expect(mockCallback).toHaveBeenCalledWith('test-data');
  });

  test('should allow removing specific event listeners', () => {
    const mockCallback = jest.fn();
    emitter.on('event', mockCallback);
    emitter.off('event', mockCallback);
    emitter.emit('event', 'test-data');
    expect(mockCallback).not.toHaveBeenCalled();
  });

  test('should remove all events ', () => {
    const mockCallback = jest.fn();
    emitter.on('event', mockCallback);
    emitter.clearListeners();
    emitter.emit('event', 'test-data');
    expect(mockCallback).not.toHaveBeenCalled();
  });

  test('should remove all event listeners for a specific event if off is called with only the event argument', () => {
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();
    emitter.on('event', mockCallback1);
    emitter.on('event', mockCallback2);
    emitter.off('event');
    emitter.emit('event', 'test-data');
    expect(mockCallback1).not.toHaveBeenCalled();
    expect(mockCallback2).not.toHaveBeenCalled();
  });

  test('destroy method should remove all event listeners', () => {
    const mockCallback = jest.fn();
    emitter.on('event', mockCallback);
    emitter.destroy();
    emitter.emit('event', 'test-data');
    expect(mockCallback).not.toHaveBeenCalled();
  });

  test('should become no-op after destroy is called', () => {
    const mockCallback = jest.fn();

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
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();

    emitter.on('event', mockCallback1);
    emitter.on('event', mockCallback2);
    emitter.emit('event', 'test-data');

    expect(mockCallback1).toHaveBeenCalledWith('test-data');
    expect(mockCallback2).toHaveBeenCalledWith('test-data');
  });

  test('removing a non-existent listener should not cause issues', () => {
    const mockCallback = jest.fn();
    emitter.off('event', mockCallback); // Listener was never added
    emitter.emit('event', 'test-data');
    expect(mockCallback).not.toHaveBeenCalled();
  });

  test('emitting an event with no listeners should not cause errors', () => {
    expect(() => {
      emitter.emit('event', 'test-data');
    }).not.toThrow();
  });

  test('adding the same listener multiple times should not duplicate calls', () => {
    const mockCallback = jest.fn();

    emitter.on('event', mockCallback);
    emitter.on('event', mockCallback); // Add the same listener again
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

    emitter.on('event1', (data) => {
      expectType<string, typeof data>(data);
    });

    emitter.emit('event2', 42);

    // Test 'off' method
    emitter.off('event1', (data) => {
      expectType<string, typeof data>(data);
    });

    // Test 'destroy' method
    emitter.destroy();

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
    const mockCallback = jest.fn();
    emitter.on('eventA', mockCallback);

    emitter.emit('eventA', { foo: 123 });
    expect(mockCallback).toHaveBeenCalledWith({ foo: 123 });
  });

  test('should handle eventB correctly', () => {
    const { emitter } = setup();
    const mockCallback = jest.fn();
    emitter.on('eventB', mockCallback);

    emitter.emit('eventB', { bar: 'test' });
    expect(mockCallback).toHaveBeenCalledWith({ bar: 'test' });
  });

  test('should not call eventB callback when emitting eventA', () => {
    const { emitter } = setup();
    const mockCallbackA = jest.fn();
    const mockCallbackB = jest.fn();

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

    // Test 'off' method with correct types
    emitter.off('eventA', (payload) => {
      // This should be correct, payload should be of type { foo: number }
      expect(payload.foo).toBeGreaterThan(0);
    });
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
