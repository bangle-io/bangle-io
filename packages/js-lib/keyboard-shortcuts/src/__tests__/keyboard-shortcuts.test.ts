/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { type KeyBinding, ShortcutManager } from '../index';

describe('ShortcutManager', () => {
  let shortcutManager: ShortcutManager;

  beforeEach(() => {
    shortcutManager = new ShortcutManager({ isDarwin: false });
  });

  test('should call handler when registered shortcut is triggered', () => {
    const handler = jest.fn();
    const keyBinding: KeyBinding = {
      id: 'testShortcut',
      keys: 'ctrl-s',
    };

    shortcutManager.register(keyBinding, handler);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    });

    shortcutManager.handleEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  test('should call all cleanup functions and clear handlers on deregisterAll', () => {
    const handler = jest.fn();

    shortcutManager.register(
      {
        id: 'testShortcut',
        keys: 'ctrl-s',
      },
      handler,
    );
    shortcutManager.register(
      {
        id: 'testShortcut',
        keys: 'ctrl-s',
      },
      handler,
    );

    shortcutManager.deregisterAll();

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    });

    shortcutManager.handleEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  test('should throw error when registering a unique shortcut that is already registered', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    const keyBinding: KeyBinding = {
      id: 'uniqueShortcut',
      keys: 'ctrl-s',
    };

    shortcutManager.register(keyBinding, handler1, { unique: true });

    expect(() => {
      shortcutManager.register(keyBinding, handler2, { unique: true });
    }).toThrow(`Shortcut "ctrl-s" is already registered as unique.`);
  });

  test('should deregister the handler when deregister function is called', () => {
    const handler = jest.fn();
    const keyBinding: KeyBinding = {
      id: 'testShortcut',
      keys: 'ctrl-s',
    };

    const deregister = shortcutManager.register(keyBinding, handler);

    // Deregister the handler
    deregister();

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    });

    shortcutManager.handleEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  test('should normalize shortcuts correctly for macOS', () => {
    const handler = jest.fn();
    const shortcutManager = new ShortcutManager({ isDarwin: true });
    const keyBinding: KeyBinding = {
      id: 'macShortcut',
      keys: 'ctrl-s',
    };

    shortcutManager.register(keyBinding, handler);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      metaKey: true,
    });

    shortcutManager.handleEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  test('should normalize shortcuts correctly for non-macOS', () => {
    const handler = jest.fn();
    const keyBinding: KeyBinding = {
      id: 'winShortcut',
      keys: 'ctrl-s',
    };

    shortcutManager.register(keyBinding, handler);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    });

    shortcutManager.handleEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  test('should call multiple handlers but the first one wins', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    const keyBinding: KeyBinding = {
      id: 'multiHandlerShortcut',
      keys: 'ctrl-s',
    };

    shortcutManager.register(keyBinding, handler1);
    shortcutManager.register(keyBinding, handler2);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    });

    shortcutManager.handleEvent(event);

    expect(handler1).toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  test('should continue to next handler if handler returns false', () => {
    const handler1 = jest.fn(() => false);
    const handler2 = jest.fn();
    const keyBinding: KeyBinding = {
      id: 'continueHandlerShortcut',
      keys: 'ctrl-s',
    };

    shortcutManager.register(keyBinding, handler1);
    shortcutManager.register(keyBinding, handler2);

    // Create a mock event object
    const event = {
      key: 's',
      ctrlKey: true,
      preventDefault: jest.fn(),
      metaKey: false,
      altKey: false,
      shiftKey: false,
    } as unknown as KeyboardEvent;

    shortcutManager.handleEvent(event);

    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });
  test('should prevent default and not call next handler if handler returns true', () => {
    const handler1 = jest.fn(() => true);
    const handler2 = jest.fn();
    const keyBinding: KeyBinding = {
      id: 'breakHandlerShortcut',
      keys: 'ctrl-s',
    };

    shortcutManager.register(keyBinding, handler1);
    shortcutManager.register(keyBinding, handler2);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    });

    jest.spyOn(event, 'preventDefault');

    shortcutManager.handleEvent(event);

    expect(handler1).toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test('should do nothing if no handler is registered for the shortcut', () => {
    const handler = jest.fn();
    const keyBinding: KeyBinding = {
      id: 'someOtherShortcut',
      keys: 'ctrl-s',
    };

    shortcutManager.register(keyBinding, handler);

    const event = new KeyboardEvent('keydown', {
      key: 'a',
      ctrlKey: true,
    });

    jest.spyOn(event, 'preventDefault');

    shortcutManager.handleEvent(event);

    expect(handler).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  test('should allow re-registering a unique shortcut after deregistering', () => {
    const handler = jest.fn();
    const keyBinding: KeyBinding = {
      id: 'uniqueShortcut',
      keys: 'ctrl-s',
    };

    const deregister = shortcutManager.register(keyBinding, handler, {
      unique: true,
    });

    // Deregister the handler
    deregister();

    expect(() => {
      shortcutManager.register(keyBinding, handler, { unique: true });
    }).not.toThrow();
  });

  test('should pass keyBinding and metadata to the handler', () => {
    const handler = jest.fn();
    const keyBinding: KeyBinding = {
      id: 'metaShortcut',
      keys: 'ctrl-m',
    };
    const metadata = { description: 'Meta shortcut for testing' };

    shortcutManager.register(keyBinding, handler, { metadata });

    const event = new KeyboardEvent('keydown', {
      key: 'm',
      ctrlKey: true,
    });

    shortcutManager.handleEvent(event);

    expect(handler).toHaveBeenCalledWith({
      keyBinding,
      metadata,
    });
  });
});
