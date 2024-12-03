import {
  type DiscriminatedEmitter,
  Emitter,
  type EventListener,
} from '@bangle.io/emitter';
import type { Command } from '@bangle.io/types';

export type EventSenderMetadata = {
  id: string;
  tag?: string;
};

type RootEvents =
  | {
      event: 'event::error:uncaught-error';
      payload: {
        rejection: boolean;
        error: Error;
        // if true, it means the error was expected and is part of the app's logic
        // for example a validation error thrown when user tries to save a document
        // they are generally not a bug.
        appLikeError: boolean;
        // if true, it means the error wasn't thrown but emitted
        // this can happen in cases where we cannot throw error and stop
        // everything in the middle of the operation.
        isFakeThrow: boolean;
        sender: EventSenderMetadata;
      };
    }
  | {
      event: 'event::workspace-info:update';
      payload: {
        wsName: string;
        type: 'workspace-create' | 'workspace-update' | 'workspace-delete';
        sender: EventSenderMetadata;
      };
    }
  | {
      event: 'event::file:update';
      payload: {
        wsPath: string;
        oldWsPath?: string;
        type:
          | 'file-create'
          | 'file-content-update'
          | 'file-delete'
          | 'file-rename';
        sender: EventSenderMetadata;
      };
    }
  | {
      event: 'event::command:result';
      payload: {
        type: 'success' | 'failure';
        command: Command;
        from: string;
      };
    };

type EmitterType = DiscriminatedEmitter<RootEvents>;

export class RootEmitter {
  private emitter: EmitterType = new Emitter();

  constructor(
    private options: {
      abortSignal: AbortSignal;
      onEvent?: (event: RootEvents) => void;
    },
  ) {
    this.options.abortSignal.addEventListener(
      'abort',
      () => {
        this.emitter.destroy();
      },
      { once: true },
    );

    if (this.options.onEvent) {
      this.emitter.onAll((event) => {
        this.options.onEvent?.(event);
      });
    }
  }

  on = <T extends RootEvents['event']>(
    event: T,
    listener: EventListener<Extract<RootEvents, { event: T }>['payload']>,
    signal: AbortSignal,
  ) => {
    return this.emitter.on(event, listener as EventListener<any>, signal);
  };

  emit = <T extends RootEvents['event']>(
    event: T,
    data: Extract<RootEvents, { event: T }>['payload'],
  ) => {
    return this.emitter.emit(event, data as any);
  };
}
