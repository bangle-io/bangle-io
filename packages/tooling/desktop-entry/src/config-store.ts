import { mkdir, open, readFile, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';

type Table = Record<string, unknown>;

type ConfigLogger = Pick<Console, 'info' | 'warn' | 'error'>;

export interface ConfigStoreOptions {
  /** Directory that holds one JSON file per table, e.g. `<userData>/config`. */
  dir: string;
  logger?: ConfigLogger;
}

/**
 * Native, file-backed key/value store for Bangle desktop **configuration** (the
 * workspace list and misc app config — never note content). One JSON file per
 * table lives under the OS user-data directory.
 *
 * Data-safety guarantees (config is app data; a corrupt or lost file must never
 * be created by this store):
 * - Writes are atomic: serialize to a `*.tmp` sibling, `fsync`, then `rename`
 *   over the target. A crash mid-write leaves the previous file intact.
 * - All writes are serialized through a single queue so concurrent puts/deletes
 *   cannot interleave or let an older completion clobber a newer one.
 * - A read that fails to parse does NOT overwrite the file: the corrupt bytes
 *   are preserved and the table is surfaced as empty, so a failed load can never
 *   destroy data on its own.
 */
export class ConfigStore {
  private readonly dir: string;
  private readonly logger: ConfigLogger;
  /** In-memory table snapshots, loaded lazily and then kept authoritative. */
  private readonly tables = new Map<string, Table>();
  /** De-dupes concurrent first loads of the same table. */
  private readonly loading = new Map<string, Promise<Table>>();
  /** Global write serialization; every persist chains onto the previous. */
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(options: ConfigStoreOptions) {
    this.dir = options.dir;
    this.logger = options.logger ?? console;
  }

  async getEntry(
    key: string,
    tableName: string,
  ): Promise<{ found: boolean; value: unknown }> {
    const table = await this.loadTable(tableName);
    const found = Object.hasOwn(table, key);
    return { found, value: found ? table[key] : undefined };
  }

  async getAllEntries(tableName: string): Promise<unknown[]> {
    const table = await this.loadTable(tableName);
    return Object.values(table);
  }

  async putEntry(
    key: string,
    value: unknown,
    tableName: string,
  ): Promise<void> {
    const table = await this.loadTable(tableName);
    table[key] = value;
    await this.persist(tableName, table);
  }

  async deleteEntry(key: string, tableName: string): Promise<void> {
    const table = await this.loadTable(tableName);
    if (!Object.hasOwn(table, key)) {
      return;
    }
    delete table[key];
    await this.persist(tableName, table);
  }

  private loadTable(tableName: string): Promise<Table> {
    const cached = this.tables.get(tableName);
    if (cached) {
      return Promise.resolve(cached);
    }

    const inFlight = this.loading.get(tableName);
    if (inFlight) {
      return inFlight;
    }

    const load = this.readTableFromDisk(tableName).then((table) => {
      this.tables.set(tableName, table);
      this.loading.delete(tableName);
      return table;
    });
    this.loading.set(tableName, load);
    return load;
  }

  private async readTableFromDisk(tableName: string): Promise<Table> {
    let raw: string;
    try {
      raw = await readFile(this.filePath(tableName), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {};
      }
      // A read failure that is not "missing file" must not be treated as data
      // loss; keep the file untouched and start from an empty in-memory view.
      this.logger.error(
        `[config] failed to read table "${tableName}"; leaving file intact`,
        error,
      );
      return {};
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Table;
      }
      this.logger.error(
        `[config] table "${tableName}" has an unexpected shape; ignoring`,
      );
      return {};
    } catch (error) {
      // Preserve the corrupt file (do not overwrite on load) so it can be
      // recovered manually; surface an empty table for this session.
      this.logger.error(
        `[config] failed to parse table "${tableName}"; preserving file`,
        error,
      );
      return {};
    }
  }

  private persist(tableName: string, table: Table): Promise<void> {
    const run = this.writeQueue.then(() =>
      this.atomicWrite(tableName, { ...table }),
    );
    // Keep the queue alive even if a write rejects, so later writes still run.
    this.writeQueue = run.catch(() => {});
    return run;
  }

  private async atomicWrite(tableName: string, table: Table): Promise<void> {
    const file = this.filePath(tableName);
    await mkdir(dirname(file), { recursive: true });

    const tmp = `${file}.tmp`;
    const data = JSON.stringify(table, null, 2);
    const handle = await open(tmp, 'w');
    try {
      await handle.writeFile(data, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(tmp, file);
  }

  private filePath(tableName: string): string {
    return join(this.dir, `${sanitizeTableName(tableName)}.json`);
  }
}

/**
 * Table names come from the renderer over IPC. Constrain them to a safe file
 * name so a hostile or malformed value cannot escape the config directory.
 */
function sanitizeTableName(tableName: string): string {
  const safe = tableName.replace(/[^A-Za-z0-9_-]/g, '_');
  if (!safe) {
    throw new Error(`Invalid config table name: ${JSON.stringify(tableName)}`);
  }
  return safe;
}
