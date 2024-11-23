import { BaseService, type Logger, isDarwin } from '@bangle.io/base-utils';
import { ShortcutManager } from '@bangle.io/keyboard-shortcuts';

export class ShortcutService extends BaseService {
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
    super('shortcut', 'core', logger);

    target.addEventListener('keydown', this.eventHandler);
  }

  protected async onInitialize(): Promise<void> {}

  protected async onDispose(): Promise<void> {
    this.target.removeEventListener('keydown', this.eventHandler);
    this.shortcutManager.deregisterAll();
  }

  register: ShortcutManager['register'] = (...args) => {
    return this.shortcutManager.register(...args);
  };
}
