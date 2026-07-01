import { BaseError } from '@bangle.io/mini-js-utils';

export type ShortcutHandler = (opts: {
  keyBinding: KeyBinding;
  metadata: RegisterOptions['metadata'];
  // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
}) => boolean | void;

export interface RegisterOptions {
  /**
   * If true, only one handler can be registered for the shortcut.
   * will throw an error if a handler is already registered.
   */
  unique?: boolean;
  /**
   * Metadata to be associated with the shortcut.
   */
  metadata?: Record<string, string>;
  /**
   * If true, handle this shortcut while focus is inside a native form control.
   */
  allowInInput?: boolean;
}

export interface KeyBinding {
  id: string;
  keys: string;
}

type HandlerData = {
  keyBinding: KeyBinding;
  handler: ShortcutHandler;
  metadata?: Record<string, string>;
  allowInInput: boolean;
};

function isNativeFormTarget(target: EventTarget | null): boolean {
  return (
    (typeof HTMLInputElement !== 'undefined' &&
      target instanceof HTMLInputElement) ||
    (typeof HTMLTextAreaElement !== 'undefined' &&
      target instanceof HTMLTextAreaElement) ||
    (typeof HTMLSelectElement !== 'undefined' &&
      target instanceof HTMLSelectElement)
  );
}

export class ShortcutManager {
  constructor(
    private options: {
      isDarwin: boolean;
    },
  ) {}

  private handlers: Map<string, HandlerData[]> = new Map();

  register(
    keyBinding: KeyBinding,
    handler: ShortcutHandler,
    options: RegisterOptions = {},
  ): () => void {
    const { keys } = keyBinding;
    const key = this.normalizeShortcut(keys);
    const unique = options.unique ?? false;

    if (unique && this.handlers.has(key)) {
      throw new BaseError({
        message: `Shortcut "${keys}" is already registered as unique.`,
      });
    }

    let handlersList = this.handlers.get(key);
    if (!handlersList) {
      handlersList = [];
      this.handlers.set(key, handlersList);
    } else if (unique) {
      throw new BaseError({
        message: `Shortcut "${keys}" is already registered.`,
      });
    }

    const handlerData = {
      keyBinding,
      handler,
      metadata: options.metadata,
      allowInInput: options.allowInInput ?? false,
    };

    handlersList.push(handlerData);

    // Return deregister function
    return () => {
      const handlersList = this.handlers.get(key);
      if (handlersList) {
        const index = handlersList.indexOf(handlerData);
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
    // safari doesn't have event.key
    if (!event.key) {
      return;
    }
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
    const handlersList =
      this.handlers.get(shortcut) ??
      (this.options.isDarwin && shortcut.startsWith('meta-')
        ? this.handlers.get(shortcut.replace(/^meta-/, 'ctrl-'))
        : undefined);

    if (handlersList) {
      const formTarget = isNativeFormTarget(event.target);
      for (const {
        allowInInput,
        handler,
        keyBinding,
        metadata,
      } of handlersList) {
        if (formTarget && !allowInInput) {
          continue;
        }
        const result = handler({
          keyBinding,
          metadata,
        });
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
