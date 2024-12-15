import {
  BaseService2,
  type BaseServiceContext,
  getEventSenderMetadata,
} from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import type { ScopedEmitter } from '@bangle.io/types';
import { atom } from 'jotai';

/**
 * Manages editor state, including reload triggers
 */
export class EditorService extends BaseService2 {
  static deps = [] as const;

  private $_forceReloadCounter = atom(0);
  $forceReloadCounter = atom((get) => get(this.$_forceReloadCounter));

  constructor(
    context: BaseServiceContext,
    dependencies: null,
    private config: {
      emitter: ScopedEmitter<
        'event::editor:reload-editor' | 'event::file:force-update'
      >;
    },
  ) {
    super(SERVICE_NAME.editorService, context, dependencies);
  }

  async hookMount(): Promise<void> {
    this.config.emitter.on(
      'event::editor:reload-editor',
      () => {
        this.store.set(this.$_forceReloadCounter, (prev) => prev + 1);
      },
      this.abortSignal,
    );
  }

  public onNativeFsAuthSuccess(wsName: string) {
    this.config.emitter.emit('event::file:force-update', {
      sender: getEventSenderMetadata({ tag: this.name }),
    });
    this.config.emitter.emit('event::editor:reload-editor', {
      wsName,
      sender: getEventSenderMetadata({ tag: this.name }),
    });
  }
}
