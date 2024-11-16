// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
type ShortcutHandler = () => boolean | void;

interface RegisterOptions {
  unique?: boolean;
}

export interface KeyBinding {
  id: string;
  keys: string;
}

export class ShortcutManager {
  constructor(
    private options: {
      isDarwin: boolean;
    },
  ) {}

  private handlers: Map<string, ShortcutHandler[]> = new Map();

  register(
    keyBinding: KeyBinding,
    handler: ShortcutHandler,
    options: RegisterOptions = {},
  ): () => void {
    const { keys } = keyBinding;
    const key = this.normalizeShortcut(keys);
    const unique = options.unique ?? false;

    if (unique && this.handlers.has(key)) {
      throw new Error(`Shortcut "${keys}" is already registered as unique.`);
    }

    let handlersList = this.handlers.get(key);
    if (!handlersList) {
      handlersList = [];
      this.handlers.set(key, handlersList);
    } else if (unique) {
      throw new Error(`Shortcut "${keys}" is already registered.`);
    }

    handlersList.push(handler);

    // Return deregister function
    return () => {
      const handlersList = this.handlers.get(key);
      if (handlersList) {
        const index = handlersList.indexOf(handler);
        if (index !== -1) {
          handlersList.splice(index, 1);
          if (handlersList.length === 0) {
            this.handlers.delete(key);
          }
        }
      }
    };
  }

  private normalizeShortcut(shortcut: string): string {
    if (this.options.isDarwin) {
      return shortcut.replace('ctrl', 'meta').toLowerCase();
    }
    return shortcut.toLowerCase();
  }

  handleEvent(event: KeyboardEvent) {
    const keys: string[] = [];
    if (event.metaKey) keys.push('meta');
    if (event.ctrlKey) keys.push('ctrl');
    if (event.altKey) keys.push('alt');
    if (event.shiftKey) keys.push('shift');

    const key = event.key.toLowerCase();
    if (!['meta', 'control', 'alt', 'shift'].includes(key)) {
      keys.push(key);
    }

    const shortcut = keys.join('-');
    const handlersList = this.handlers.get(shortcut);

    if (handlersList) {
      for (const handler of handlersList) {
        const result = handler();
        if (result !== false) {
          event.preventDefault();
          break;
        }
      }
    }
  }

  deregisterAll() {
    this.handlers.clear();
  }
}
