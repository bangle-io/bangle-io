import type { Logger } from '@bangle.io/logger';

export interface BroadcastMessage<T> {
  senderId: string;
  data: T;
  timestamp: number;
  isSelf: boolean;
}

type RawBroadcastMessage<T> = Omit<BroadcastMessage<T>, 'isSelf'>;

export type MessageHandler<T> = (msg: BroadcastMessage<T>) => void;

export interface TypedBroadcastBusOptions {
  /**
   * Unique name of the channel used for broadcasting messages.
   */
  name: string;
  /**
   * A unique identifier for the sender.
   */
  senderId: string;
  /**
   * Optional logger for debugging or error logging.
   */
  logger?: Logger;

  useMemoryChannel?: boolean;

  /**
   * AbortSignal to cleanup resources when aborted
   */
  signal: AbortSignal;
}

export class TypedBroadcastBus<T> {
  _channel: BroadcastChannel;
  private handlers = new Set<MessageHandler<T>>();
  private readonly senderId: string;
  private readonly logger?: Logger;

  constructor(options: TypedBroadcastBusOptions) {
    this.senderId = options.senderId;
    this.logger = options.logger;

    const shouldUseNativeChannel =
      !options.useMemoryChannel && typeof BroadcastChannel !== 'undefined';

    if (shouldUseNativeChannel) {
      this._channel = new BroadcastChannel(options.name);
      this.logger?.debug?.('Using native BroadcastChannel.');
    } else {
      this._channel = new MemoryBroadcastChannel(options.name);
      this.logger?.debug?.(
        options.useMemoryChannel
          ? 'Using MemoryBroadcastChannel due to options.useMemoryChannel.'
          : 'Using MemoryBroadcastChannel due to native BroadcastChannel not being available.',
      );
    }

    this._channel.onmessage = this.handleMessage;

    options.signal.addEventListener(
      'abort',
      () => {
        this.handlers.clear();
        this._channel.onmessage = null;
        this._channel.close();
      },
      { once: true },
    );
  }

  private handleMessage = (event: MessageEvent) => {
    const rawMessage = event.data as RawBroadcastMessage<T>;

    if (
      !rawMessage ||
      typeof rawMessage !== 'object' ||
      !rawMessage.senderId ||
      !('data' in rawMessage)
    ) {
      this.logger?.error('Invalid message received', rawMessage);
      return;
    }

    const isSelf = rawMessage.senderId === this.senderId;
    const message: BroadcastMessage<T> = {
      ...rawMessage,
      isSelf,
    };

    this.logger?.debug?.(
      `received message from ${rawMessage.senderId}`,
      message,
    );

    for (const handler of this.handlers) {
      handler(message);
    }
  };

  /**
   * Send a message to all listeners on this channel including self.
   */
  send(data: T): void {
    const rawMessage: RawBroadcastMessage<T> = {
      senderId: this.senderId,
      data,
      timestamp: Date.now(),
    };
    this.logger?.debug?.('sending message', rawMessage);

    // Send through broadcast channel (for other instances)
    this._channel.postMessage(rawMessage);

    // If using native BroadcastChannel (not memory), explicitly handle self message
    if (!(this._channel instanceof MemoryBroadcastChannel)) {
      // Manually trigger self message
      this.handleMessage(new MessageEvent('message', { data: rawMessage }));
    }
  }

  subscribe(handler: MessageHandler<T>, signal: AbortSignal) {
    this.handlers.add(handler);

    signal.addEventListener(
      'abort',
      () => {
        this.handlers.delete(handler);
      },
      { once: true },
    );
  }
}

export class MemoryBroadcastChannel implements BroadcastChannel {
  onmessage: ((event: MessageEvent) => void) | null = null;
  private static channels: Map<string, Set<MemoryBroadcastChannel>> = new Map();
  private closed = false;

  name: string;
  constructor(public channelName: string) {
    this.name = channelName;
    if (!MemoryBroadcastChannel.channels.has(channelName)) {
      MemoryBroadcastChannel.channels.set(channelName, new Set());
    }
    MemoryBroadcastChannel.channels.get(channelName)?.add(this);
  }

  postMessage(data: unknown) {
    if (this.closed) return;

    const event = new MessageEvent('message', { data });
    const channels = MemoryBroadcastChannel.channels.get(this.channelName);

    if (channels) {
      for (const channel of channels) {
        if (!channel.closed && channel.onmessage) {
          channel.onmessage(event);
        }
      }
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    const channels = MemoryBroadcastChannel.channels.get(this.channelName);
    if (channels) {
      channels.delete(this);
      if (channels.size === 0) {
        MemoryBroadcastChannel.channels.delete(this.channelName);
      }
    }
    this.onmessage = null;
  }
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  addEventListener() {
    throw new Error('Method not implemented.');
  }

  removeEventListener() {
    throw new Error('Method not implemented.');
  }

  dispatchEvent = () => {
    throw new Error('Method not implemented.');
  };
}
