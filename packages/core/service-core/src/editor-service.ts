import { BaseService, getEventSenderMetadata } from '@bangle.io/base-utils';
import type { BaseServiceCommonOptions, ScopedEmitter } from '@bangle.io/types';
import { atom } from 'jotai';
import type { FileSystemService } from './file-system-service';

export class EditorService extends BaseService<{
  dummyVal: string;
}> {
  private $_forceReloadCounter = atom(0);

  $forceReloadCounter = atom((get) => get(this.$_forceReloadCounter));

  constructor(
    baseOptions: BaseServiceCommonOptions,
    // biome-ignore lint/complexity/noBannedTypes: <explanation>
    dependencies: {},
    private options: {
      emitter: ScopedEmitter<
        'event::editor:reload-editor' | 'event::file:force-update'
      >;
    },
  ) {
    super({
      ...baseOptions,
      name: 'editor',
      kind: 'core',
      needsConfig: true,
      dependencies,
    });
  }

  protected hookPostConfigSet(): void {}

  protected async hookOnInitialize(): Promise<void> {
    this.options.emitter.on(
      'event::editor:reload-editor',
      () => {
        // TODO implement a check for wsName
        this.store.set(this.$_forceReloadCounter, (prev) => prev + 1);
      },
      this.abortSignal,
    );
  }

  protected async hookOnDispose(): Promise<void> {}

  //   TODO not a great way to do this, but right we need to reload the editor page to make it
  //  work.
  onNativeFsAuthSuccess(wsName: string) {
    this.options.emitter.emit('event::file:force-update', {
      sender: getEventSenderMetadata({ tag: this.name }),
    });
    this.options.emitter.emit('event::editor:reload-editor', {
      wsName,
      sender: getEventSenderMetadata({ tag: this.name }),
    });
  }
}
