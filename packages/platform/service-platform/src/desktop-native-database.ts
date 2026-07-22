import {
  BaseService,
  type BaseServiceContext,
  isAppError,
  throwAppError,
} from '@bangle.io/base-utils';
import { TypedBroadcastBus } from '@bangle.io/browser-utils';
import { BROWSING_CONTEXT_ID } from '@bangle.io/config';
import { SERVICE_NAME } from '@bangle.io/constants';
import type {
  BaseAppDatabase,
  DatabaseChange,
  DatabaseQueryOptions,
  DesktopConfigBridge,
} from '@bangle.io/types';

/**
 * Async `BaseAppDatabase` backed by the Electron native config store. Every
 * operation is delegated over IPC to `window.bangleDesktop.configDb`, which the
 * preload exposes and the main process fulfils against a JSON file under the OS
 * user-data directory.
 *
 * Only serializable values reach this service — `DesktopHybridDatabaseService`
 * routes records carrying a native-FS handle to IndexedDB before they get here.
 *
 * `updateEntry` performs read-modify-write in the renderer (the callback is
 * renderer code and cannot cross IPC). A per-key promise chain serializes those
 * cycles so an older completion can never overwrite a newer edit. The desktop is
 * effectively single-writer, so this ordering plus the main-process write queue
 * is sufficient; cross-window change propagation is a documented extension.
 */
export class DesktopNativeDatabaseService
  extends BaseService
  implements BaseAppDatabase
{
  private readonly bridge: DesktopConfigBridge;
  private changeBus!: TypedBroadcastBus<DatabaseChange>;
  private readonly writeChains = new Map<string, Promise<unknown>>();

  constructor(
    context: BaseServiceContext,
    dependencies: null,
    config: { bridge: DesktopConfigBridge },
  ) {
    super(SERVICE_NAME.desktopNativeDatabaseService, context, dependencies);
    this.bridge = config.bridge;
  }

  async hookMount(): Promise<void> {
    this.changeBus = new TypedBroadcastBus({
      name: this.name,
      senderId: BROWSING_CONTEXT_ID,
      logger: this.logger.child('bus'),
      useMemoryChannel: true,
      signal: this.abortSignal,
    });
  }

  async getEntry(
    key: string,
    options: DatabaseQueryOptions,
  ): Promise<{ found: boolean; value: unknown }> {
    await this.mountPromise;
    try {
      return await this.bridge.getEntry(key, options);
    } catch (error) {
      this.throwError(error);
    }
  }

  async updateEntry(
    key: string,
    updateCallback: (options: { value: unknown; found: boolean }) => {
      value: unknown;
    } | null,
    options: DatabaseQueryOptions,
  ): Promise<{ value: unknown; found: boolean }> {
    await this.mountPromise;
    return this.enqueue(options.tableName, key, async () => {
      try {
        const existing = await this.bridge.getEntry(key, options);
        const updated = updateCallback({
          found: existing.found,
          value: existing.value,
        });

        if (!updated) {
          return { found: false, value: undefined };
        }

        await this.bridge.putEntry(key, updated.value, options);

        const change: DatabaseChange = {
          type: existing.found ? 'update' : 'create',
          tableName: options.tableName,
          key,
          value: updated.value,
        };
        this.changeBus.send(change);

        return { found: true, value: updated.value };
      } catch (error) {
        this.throwError(error);
      }
    });
  }

  async deleteEntry(key: string, options: DatabaseQueryOptions): Promise<void> {
    await this.mountPromise;
    await this.enqueue(options.tableName, key, async () => {
      try {
        await this.bridge.deleteEntry(key, options);
        this.changeBus.send({
          type: 'delete',
          tableName: options.tableName,
          key,
          value: undefined,
        });
      } catch (error) {
        this.throwError(error);
      }
    });
  }

  async getAllEntries(options: DatabaseQueryOptions): Promise<unknown[]> {
    await this.mountPromise;
    try {
      return await this.bridge.getAllEntries(options);
    } catch (error) {
      this.throwError(error);
    }
  }

  subscribe(
    options: DatabaseQueryOptions,
    callback: (change: DatabaseChange) => void,
    signal: AbortSignal,
  ): void {
    if (this.aborted) {
      return;
    }
    this.changeBus.subscribe((msg) => {
      if (msg.data.tableName === options.tableName) {
        callback(msg.data);
      }
    }, signal);
  }

  /**
   * Serializes read-modify-write cycles per (table, key). Later work chains onto
   * the prior promise; a rejected step does not wedge the chain.
   */
  private enqueue<T>(
    tableName: string,
    key: string,
    task: () => Promise<T>,
  ): Promise<T> {
    const chainKey = `${tableName}:${key}`;
    const previous = this.writeChains.get(chainKey) ?? Promise.resolve();
    const next = previous.then(task, task);
    this.writeChains.set(
      chainKey,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  }

  private throwError(error: unknown): never {
    if (isAppError(error)) {
      this.logger.error('App error:', error);
      throw error;
    }

    if (error instanceof Error) {
      this.logger.error('Unknown error:', error);
      throwAppError(
        'error::database:unknown-error',
        'Failed to perform database operation',
        {
          error,
          databaseName: this.name,
        },
      );
    }
    this.logger.error('Unknown non-Error object:', error);
    throw error;
  }
}
