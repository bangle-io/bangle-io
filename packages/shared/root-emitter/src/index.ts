import { Emitter, type EventListener } from '@bangle.io/emitter';
import type { Command } from '@bangle.io/types';

export type EventSenderMetadata = {
  id: string;
  tag?: string;
};

export type RootEvents =
  | {
      event: 'event::error:uncaught-error';
      payload: {
        isRejection: boolean;
        error: Error;
        // if true, it means the error was expected and is part of the app's logic
        // for example a validation error thrown when user tries to save a document
        // they are generally not a bug.
        isAppError: boolean;
        // if true, it means the error wasn't thrown but emitted
        // this can happen in cases where we cannot throw error and stop
        // everything in the middle of the operation.
        isFakeThrow: boolean;
        sender: EventSenderMetadata;
      };
    }
  | {
      event: 'event::app:reload-ui';
      payload: {
        sender: EventSenderMetadata;
      };
    }
  | {
      event: 'event::editor:reload-editor';
      payload: {
        wsName: string;
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
      event: 'event::file:force-update';
      payload: {
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

// These events are allowed to be broadcasted to other tabs
export const CROSS_TAB_EVENTS = [
  'event::file:update',
  'event::file:force-update',
  'event::app:reload-ui',
] as const satisfies RootEvents['event'][];

export type CrossTabEvent = (typeof CROSS_TAB_EVENTS)[number];

export class RootEmitter {
  private publisher: Emitter;
  private subscriber: Emitter;

  constructor(
    private options: {
      abortSignal: AbortSignal;
      onEvent?: (event: RootEvents) => void;
      pubSub?: {
        publisher: Emitter;
        subscriber: Emitter;
      };
    },
  ) {
    if (this.options.pubSub) {
      const { publisher, subscriber } = this.options.pubSub;
      if (!publisher || !subscriber) {
        throw new Error(
          'Both publisher and subscriber must be provided together',
        );
      }
      this.publisher = publisher;
      this.subscriber = subscriber;
    } else {
      this.publisher = new Emitter();
      this.subscriber = new Emitter();
      this.options.abortSignal.addEventListener(
        'abort',
        () => {
          this.publisher.destroy();
          this.subscriber.destroy();
        },
        { once: true },
      );

      // Wire the default publisher and subscriber
      this.publisher.onAll(({ event, payload }) => {
        this.subscriber.emit(event, payload);
      });
    }

    if (this.options.onEvent) {
      this.subscriber.onAll(({ event, payload }) => {
        this.options.onEvent?.({ event, payload } as RootEvents);
      });
    }
  }

  on = <T extends RootEvents['event']>(
    event: T,
    listener: EventListener<Extract<RootEvents, { event: T }>['payload']>,
    signal: AbortSignal,
  ) => {
    return this.subscriber.on(
      event,
      listener as EventListener<unknown>,
      signal,
    );
  };

  emit = <T extends RootEvents['event']>(
    event: T,
    data: Extract<RootEvents, { event: T }>['payload'],
  ) => {
    return this.publisher.emit(event, data);
  };

  scoped<T extends RootEvents['event']>(
    scopedEvents: T[],
    signal: AbortSignal,
  ) {
    const combinedController = new AbortController();

    // Create independent signal handlers to avoid race conditions
    signal.addEventListener(
      'abort',
      () => {
        combinedController.abort();
      },
      { once: true },
    );

    this.options.abortSignal.addEventListener(
      'abort',
      () => {
        combinedController.abort();
      },
      { once: true },
    );

    return new ScopedEmitter({
      scope: scopedEvents,
      publisher: this.publisher,
      subscriber: this.subscriber,
      signal: combinedController.signal,
    });
  }
}

export class ScopedEmitter<TScope extends RootEvents['event']> {
  constructor(
    private config: {
      scope: TScope[];
      publisher: Emitter<any>;
      subscriber: Emitter<any>;
      signal: AbortSignal;
    },
  ) {}

  private validateEvent(event: TScope) {
    if (!this.config.scope.includes(event)) {
      throw new Error(
        `Event "${event}" is not in allowed scope. Allowed events are: ${this.config.scope.join(
          ', ',
        )}`,
      );
    }
  }

  on = <T extends TScope>(
    event: T,
    listener: EventListener<Extract<RootEvents, { event: T }>['payload']>,
    signal: AbortSignal,
  ) => {
    this.validateEvent(event);

    const combinedSignal = new AbortController();

    signal.addEventListener('abort', () => combinedSignal.abort());
    this.config.signal.addEventListener('abort', () => combinedSignal.abort());

    return this.config.subscriber.on(
      event,
      listener as EventListener<any>,
      combinedSignal.signal,
    );
  };

  emit = <T extends TScope>(
    event: T,
    data: Extract<RootEvents, { event: T }>['payload'],
  ) => {
    this.validateEvent(event);
    return this.config.publisher.emit(event, data);
  };
}
