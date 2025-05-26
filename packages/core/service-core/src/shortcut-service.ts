import {
  BaseService,
  type BaseServiceContext,
  isDarwin,
} from '@bangle.io/base-utils';
import type {
  KeyBinding,
  RegisterOptions,
  ShortcutHandler,
} from '@bangle.io/browser-utils';
import { ShortcutManager } from '@bangle.io/browser-utils';
import { SERVICE_NAME } from '@bangle.io/constants';

export type ShortcutServiceConfig = {
  keyBinding: KeyBinding;
  handler: ShortcutHandler;
  options: RegisterOptions;
};

/**
 * Manages global keyboard shortcuts
 */
export class ShortcutService extends BaseService {
  static deps = [] as const;

  private shortcutManager = new ShortcutManager({
    isDarwin: isDarwin,
  });

  eventHandler = (event: KeyboardEvent) => {
    if (!this.mounted) {
      this.logger.warn('ShortcutService is not ok');
      return;
    }
    this.shortcutManager.handleEvent(event);
  };

  constructor(
    context: BaseServiceContext,
    dependencies: null,
    private config: {
      target: {
        addEventListener: Document['addEventListener'];
        removeEventListener: Document['removeEventListener'];
      };
      shortcuts: ShortcutServiceConfig[];
    },
  ) {
    super(SERVICE_NAME.shortcutService, context, dependencies);
    for (const shortcut of this.config.shortcuts) {
      this.register(shortcut);
    }
  }

  hookMount() {
    this.config.target.addEventListener('keydown', this.eventHandler);
    this.addCleanup(() => {
      this.config.target.removeEventListener('keydown', this.eventHandler);
      this.shortcutManager.deregisterAll();
    });
  }

  public register(shortcut: ShortcutServiceConfig) {
    return this.shortcutManager.register(
      shortcut.keyBinding,
      shortcut.handler,
      shortcut.options,
    );
  }
}
