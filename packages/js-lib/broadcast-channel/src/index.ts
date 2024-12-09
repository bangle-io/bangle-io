import type { Logger } from '@bangle.io/logger';

export interface BroadcastMessage<T> {
  senderId: string;
  data: T;
  timestamp: number;
}

export type MessageHandler<T> = (msg: BroadcastMessage<T>) => void;

export interface TypedBroadcastBusOptions {
  /**
   * Unique name of the channel used for broadcasting messages.
   */
  name: string;
  /**
   * A unique identifier for the sender. Messages from this senderId will be ignored locally.
   */
  senderId: string;
  /**
   * Optional logger for debugging or error logging.
   */
  logger?: Logger;
}

export class TypedBroadcastBus<T> {
  _channel: BroadcastChannel;
  private handlers = new Set<MessageHandler<T>>();
  private readonly senderId: string;
  private readonly logger?: Logger;

  constructor(options: TypedBroadcastBusOptions) {
    this._channel = new BroadcastChannel(options.name);
    this.senderId = options.senderId;
    this.logger = options.logger;

    this._channel.onmessage = this.handleMessage;
  }

  private handleMessage = (event: MessageEvent) => {
    const message = event.data as BroadcastMessage<T>;

    if (
      !message ||
      typeof message !== 'object' ||
      !message.senderId ||
      !('data' in message)
    ) {
      this.logger?.error('Invalid message received', message);
      return;
    }

    // Ignore messages from self
    if (message.senderId === this.senderId) {
      return;
    }

    this.logger?.debug?.(`received message from ${message.senderId}`, message);

    for (const handler of this.handlers) {
      handler(message);
    }
  };

  /**
   * Send a message to all other listeners on this channel.
   */
  send(data: T): void {
    const message: BroadcastMessage<T> = {
      senderId: this.senderId,
      data,
      timestamp: Date.now(),
    };
    this.logger?.debug?.('sending message', message);
    this._channel.postMessage(message);
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

  dispose(): void {
    this.handlers.clear();
    this._channel.onmessage = null;
    this._channel.close();
  }
}

export class MemoryBroadcastChannel {
  onmessage: ((event: MessageEvent) => void) | null = null;
  private static channels: Map<string, Set<MemoryBroadcastChannel>> = new Map();
  private closed = false;

  constructor(public channelName: string) {
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
        if (channel !== this && !channel.closed) {
          if (channel.onmessage) {
            channel.onmessage(event);
          }
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
}
