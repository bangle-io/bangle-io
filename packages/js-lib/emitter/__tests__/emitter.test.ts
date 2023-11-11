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

  test('should remove all events if off is called without arguments', () => {
    const mockCallback = jest.fn();
    emitter.on('event', mockCallback);
    emitter.off();
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
});
