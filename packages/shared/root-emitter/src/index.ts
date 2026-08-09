import { Emitter, type EventListener } from '@bangle.io/mini-js-utils';
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
  // This tab is running an older app build than another tab and must reload.
  // Local-only: the browser-entry build handshake emits it in the stale tab.
  | {
      event: 'event::app:stale-tab';
      payload: {
        sender: EventSenderMetadata;
      };
    }
  | {
      event: 'event::app:build-presence';
      payload: {
        protocol: 1;
        buildId: string;
        builtAt: number;
        reply: boolean;
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
        /**
         * When set, the refresh concerns a single workspace (e.g. a storage
         * watcher's coarse "something changed here"); consumers doing
         * per-workspace work can scope to it. Absent means app-wide.
         */
        wsName?: string;
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
  'event::app:build-presence',
] as const satisfies RootEvents['event'][];
export type CrossTabEvent = (typeof CROSS_TAB_EVENTS)[number];

export type CrossTabRootEvent = Extract<RootEvents, { event: CrossTabEvent }>;

/**
 * The inner payload sent through the cross-tab transport.
 *
 * `event` and `payload` intentionally remain at the top level so tabs running
 * the pre-versioned protocol can still read messages emitted by newer tabs.
 */
export type RootEventWireEnvelope<TEvent extends CrossTabRootEvent> = TEvent & {
  version: 1;
};

const FILE_UPDATE_TYPES = new Set([
  'file-create',
  'file-content-update',
  'file-delete',
  'file-rename',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.hasOwn(value, key);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isEventSenderMetadata(value: unknown): value is EventSenderMetadata {
  if (!isRecord(value) || !hasOwn(value, 'id') || !isNonEmptyString(value.id)) {
    return false;
  }

  return (
    !hasOwn(value, 'tag') ||
    value.tag === undefined ||
    typeof value.tag === 'string'
  );
}

function isFileUpdatePayload(
  value: unknown,
): value is Extract<
  CrossTabRootEvent,
  { event: 'event::file:update' }
>['payload'] {
  if (
    !isRecord(value) ||
    !hasOwn(value, 'type') ||
    typeof value.type !== 'string' ||
    !FILE_UPDATE_TYPES.has(value.type) ||
    !hasOwn(value, 'wsPath') ||
    !isNonEmptyString(value.wsPath) ||
    !hasOwn(value, 'sender') ||
    !isEventSenderMetadata(value.sender)
  ) {
    return false;
  }

  // This boundary only establishes that a path is safely shaped for the wire.
  // Full workspace-path parsing belongs to the workspace-path package; importing
  // it here would couple the shared event transport to that higher-level policy.
  return (
    !hasOwn(value, 'oldWsPath') ||
    value.oldWsPath === undefined ||
    isNonEmptyString(value.oldWsPath)
  );
}

function isForceUpdatePayload(
  value: unknown,
): value is Extract<
  CrossTabRootEvent,
  { event: 'event::file:force-update' }
>['payload'] {
  if (
    !isRecord(value) ||
    !hasOwn(value, 'sender') ||
    !isEventSenderMetadata(value.sender)
  ) {
    return false;
  }

  return (
    !hasOwn(value, 'wsName') ||
    value.wsName === undefined ||
    isNonEmptyString(value.wsName)
  );
}

function isReloadUiPayload(
  value: unknown,
): value is Extract<
  CrossTabRootEvent,
  { event: 'event::app:reload-ui' }
>['payload'] {
  return (
    isRecord(value) &&
    hasOwn(value, 'sender') &&
    isEventSenderMetadata(value.sender)
  );
}

function isBuildPresencePayload(
  value: unknown,
): value is Extract<
  CrossTabRootEvent,
  { event: 'event::app:build-presence' }
>['payload'] {
  return (
    isRecord(value) &&
    hasOwn(value, 'protocol') &&
    value.protocol === 1 &&
    hasOwn(value, 'buildId') &&
    isNonEmptyString(value.buildId) &&
    hasOwn(value, 'builtAt') &&
    typeof value.builtAt === 'number' &&
    Number.isFinite(value.builtAt) &&
    hasOwn(value, 'reply') &&
    typeof value.reply === 'boolean' &&
    hasOwn(value, 'sender') &&
    isEventSenderMetadata(value.sender)
  );
}

function decodeRootEventWireMessage(
  value: unknown,
): CrossTabRootEvent | undefined {
  try {
    if (
      !isRecord(value) ||
      !hasOwn(value, 'event') ||
      !hasOwn(value, 'payload') ||
      ('version' in value && (!hasOwn(value, 'version') || value.version !== 1))
    ) {
      return undefined;
    }

    switch (value.event) {
      case 'event::file:update': {
        if (!isFileUpdatePayload(value.payload)) {
          return undefined;
        }
        return { event: value.event, payload: value.payload };
      }
      case 'event::file:force-update': {
        if (!isForceUpdatePayload(value.payload)) {
          return undefined;
        }
        return { event: value.event, payload: value.payload };
      }
      case 'event::app:reload-ui': {
        if (!isReloadUiPayload(value.payload)) {
          return undefined;
        }
        return { event: value.event, payload: value.payload };
      }
      case 'event::app:build-presence': {
        if (!isBuildPresencePayload(value.payload)) {
          return undefined;
        }
        return { event: value.event, payload: value.payload };
      }
      default:
        return undefined;
    }
  } catch {
    // BroadcastChannel normally structured-clones plain data, but malformed
    // frames can also be injected directly in development and test contexts.
    return undefined;
  }
}

/**
 * Codec for the root-event payload nested inside `TypedBroadcastBus` frames.
 * It accepts both the versioned v1 envelope and legacy `{ event, payload }`
 * envelopes while all new outbound frames use v1.
 */
export const rootEventWireCodec = {
  encode<TEvent extends CrossTabRootEvent>(
    event: TEvent,
  ): RootEventWireEnvelope<TEvent> {
    return {
      version: 1,
      ...event,
    };
  },

  decode(value: unknown): CrossTabRootEvent | undefined {
    return decodeRootEventWireMessage(value);
  },
};

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
