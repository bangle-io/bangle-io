import { BaseService, type Logger, isDarwin } from '@bangle.io/base-utils';
import type {
  KeyBinding,
  RegisterOptions,
  ShortcutHandler,
} from '@bangle.io/keyboard-shortcuts';
import { ShortcutManager } from '@bangle.io/keyboard-shortcuts';

export type ShortcutServiceConfig = {
  keyBinding: KeyBinding;
  handler: ShortcutHandler;
  options: RegisterOptions;
};

export class ShortcutService extends BaseService<{
  shortcuts: ShortcutServiceConfig[];
}> {
  private shortcutManager = new ShortcutManager({
    isDarwin: isDarwin,
  });

  eventHandler = (event: KeyboardEvent) => {
    if (!this.isOk) {
      this.logger.warn('ShortcutService is not ok');
      return;
    }
    this.shortcutManager.handleEvent(event);
  };

  constructor(
    logger: Logger,
    private readonly target: Document,
  ) {
    super('shortcut', 'core', logger, {}, { needsConfig: true });

    target.addEventListener('keydown', this.eventHandler);
  }

  protected hookPostConfigSet(): void {
    for (const shortcut of this.config.shortcuts) {
      this.register(shortcut);
    }
  }

  protected async onInitialize(): Promise<void> {}

  protected async onDispose(): Promise<void> {
    this.target.removeEventListener('keydown', this.eventHandler);
    this.shortcutManager.deregisterAll();
  }

  register(shortcut: ShortcutServiceConfig) {
    return this.shortcutManager.register(
      shortcut.keyBinding,
      shortcut.handler,
      shortcut.options,
    );
  }
}
