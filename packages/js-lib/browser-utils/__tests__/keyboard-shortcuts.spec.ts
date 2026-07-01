// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { type KeyBinding, ShortcutManager } from '../src/keyboard-shortcuts'; // Adjusted import path

describe('ShortcutManager', () => {
  let shortcutManager: ShortcutManager;

  beforeEach(() => {
    shortcutManager = new ShortcutManager({ isDarwin: false });
  });

  test('should call handler when registered shortcut is triggered', () => {
    const handler = vi.fn();
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

  test('should not handle app shortcuts from native form controls', () => {
    const handler = vi.fn();
    const keyBinding: KeyBinding = {
      id: 'formShortcut',
      keys: 'ctrl-s',
    };
    const input = document.createElement('input');

    shortcutManager.register(keyBinding, handler);
    input.addEventListener('keydown', (event) => {
      shortcutManager.handleEvent(event);
    });

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  test('should handle opt-in shortcuts from native form controls', () => {
    const handler = vi.fn();
    const keyBinding: KeyBinding = {
      id: 'formAllowedShortcut',
      keys: 'ctrl-k',
    };
    const input = document.createElement('input');

    shortcutManager.register(keyBinding, handler, { allowInInput: true });
    input.addEventListener('keydown', (event) => {
      shortcutManager.handleEvent(event);
    });

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  test('should call all cleanup functions and clear handlers on deregisterAll', () => {
    const handler = vi.fn();

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
    const handler1 = vi.fn();
    const handler2 = vi.fn();
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
    const handler = vi.fn();
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
    const handler = vi.fn();
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
    const handler = vi.fn();
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

  test('should match meta events to canonical ctrl shortcuts', () => {
    const handler = vi.fn();
    const shortcutManager = new ShortcutManager({ isDarwin: true });
    const keyBinding: KeyBinding = {
      id: 'canonicalCtrlShortcut',
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

  test('should match meta backslash events to canonical ctrl backslash shortcuts', () => {
    const handler = vi.fn();
    const shortcutManager = new ShortcutManager({ isDarwin: true });
    const keyBinding: KeyBinding = {
      id: 'canonicalCtrlBackslashShortcut',
      keys: 'ctrl-\\',
    };

    shortcutManager.register(keyBinding, handler);

    const event = new KeyboardEvent('keydown', {
      key: '\\',
      metaKey: true,
    });

    shortcutManager.handleEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  test('should not match meta events to ctrl shortcuts for non-macOS', () => {
    const handler = vi.fn();
    const keyBinding: KeyBinding = {
      id: 'nonMacCanonicalCtrlShortcut',
      keys: 'ctrl-s',
    };

    shortcutManager.register(keyBinding, handler);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      metaKey: true,
    });

    shortcutManager.handleEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  test('should not normalize meta shortcuts to ctrl for non-macOS', () => {
    const handler = vi.fn();
    const keyBinding: KeyBinding = {
      id: 'nonMacMetaShortcut',
      keys: 'meta-s',
    };

    shortcutManager.register(keyBinding, handler);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    });

    shortcutManager.handleEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  test('should call multiple handlers but the first one wins', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
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
    const handler1 = vi.fn(() => false);
    const handler2 = vi.fn();
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
      preventDefault: vi.fn(),
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
    const handler1 = vi.fn(() => true);
    const handler2 = vi.fn();
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

    vi.spyOn(event, 'preventDefault');

    shortcutManager.handleEvent(event);

    expect(handler1).toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test('should do nothing if no handler is registered for the shortcut', () => {
    const handler = vi.fn();
    const keyBinding: KeyBinding = {
      id: 'someOtherShortcut',
      keys: 'ctrl-s',
    };

    shortcutManager.register(keyBinding, handler);

    const event = new KeyboardEvent('keydown', {
      key: 'a',
      ctrlKey: true,
    });

    vi.spyOn(event, 'preventDefault');

    shortcutManager.handleEvent(event);

    expect(handler).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  test('should allow re-registering a unique shortcut after deregistering', () => {
    const handler = vi.fn();
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
    const handler = vi.fn();
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
