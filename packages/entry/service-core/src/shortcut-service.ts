import { BaseService, isDarwin } from '@bangle.io/base-utils';
import type {
  KeyBinding,
  RegisterOptions,
  ShortcutHandler,
} from '@bangle.io/keyboard-shortcuts';
import { ShortcutManager } from '@bangle.io/keyboard-shortcuts';
import type { BaseServiceCommonOptions } from '@bangle.io/types';

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
    baseOptions: BaseServiceCommonOptions,
    _dependencies: undefined,
    private readonly target: Document,
  ) {
    super({
      ...baseOptions,
      name: 'shortcut',
      kind: 'core',
      needsConfig: true,
    });

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
