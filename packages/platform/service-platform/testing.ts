import { MemorySyncDatabaseService } from './src/memory-sync-database';

export { FileStorageMemory } from './src/file-storage-memory';
export { MemoryDatabaseService } from './src/memory-database';
export { MemoryRouterService } from './src/router/memory-router';
export { TestErrorHandlerService } from './src/test-error-handler';
export { MemorySyncDatabaseService };

/**
 * The real in-memory sync database with an explicit fault control for tests
 * that exercise storage failures after normal service startup.
 */
export class TestSyncDatabaseService extends MemorySyncDatabaseService {
  private writeFailure: Error | undefined;

  failWrites(error = new Error('Sync database is unavailable')): void {
    this.writeFailure = error;
  }

  allowWrites(): void {
    this.writeFailure = undefined;
  }

  override updateEntry(
    ...args: Parameters<MemorySyncDatabaseService['updateEntry']>
  ): ReturnType<MemorySyncDatabaseService['updateEntry']> {
    if (this.writeFailure) {
      throw this.writeFailure;
    }
    return super.updateEntry(...args);
  }
}
