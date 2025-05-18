import {
  BaseService,
  type BaseServiceContext,
  type Logger,
  atomStorage,
  createAsyncAtom,
  throwAppError,
} from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import { type InferType, T } from '@bangle.io/mini-zod';
import type {
  BaseSyncDatabaseService,
  CommandDispatchResult,
  ScopedEmitter,
} from '@bangle.io/types';
import type { WsPath } from '@bangle.io/ws-path';
import { type PrimitiveAtom, atom } from 'jotai';
import type { WorkspaceOpsService } from './workspace-ops-service';
import type { WorkspaceStateService } from './workspace-state-service';

const DEFAULT_MAX_RECENT_ENTRIES = 100;
const DEFAULT_ACTIVITY_COOLDOWN_MS = 5000;

const EntityValidators = {
  'ws-path': T.Object({ wsPath: T.String }),
  command: T.Object({ commandId: T.String }),
} as const;

type EntityType = keyof typeof EntityValidators;
type EntityData<T extends EntityType> = InferType<(typeof EntityValidators)[T]>;

type ActivityLogEntry<T extends EntityType = EntityType> = {
  entityType: T;
  data: EntityData<T>;
  timestamp: number;
};

const ACTIVITY_LOG_KEY = 'ws-activity';
const STARRED_ITEMS_KEY = 'starred-items';

/**
 * Tracks user activities like recent workspaces and commands executed
 */
export class UserActivityService extends BaseService {
  static deps = ['workspaceState', 'workspaceOps', 'syncDatabase'] as const;

  // TODO: activityLogCache need to have size limit
  private activityLogCache: Map<string, ActivityLogEntry[]> = new Map();
  private maxRecentEntries!: number;
  private activityCooldownMs!: number;
  private $refreshActivityCounter = atom(0);
  private $_timesAppLoaded: PrimitiveAtom<number> | undefined;
  private $starredItemsChangeCounter = atom(0);
  private starredItemManager: StarredItemManager;

  $isNewUser = atom((get) => {
    return get(this.$timesAppLoaded) <= 1;
  });

  $allRecentWsPaths = createAsyncAtom(
    async (get): Promise<Array<{ wsPath: string; timestamp: number }>> => {
      await this.mountPromise;
      get(this.$refreshActivityCounter);

      const workspaces = await this.workspaceOps.getAllWorkspaces();
      const allActivities: ActivityLogEntry<'ws-path'>[] = [];

      for (const workspace of workspaces) {
        const activities = await this.getRecent(workspace.name, 'ws-path');
        allActivities.push(...activities);
      }

      allActivities.sort((a, b) => b.timestamp - a.timestamp);

      const seen = new Set<string>();
      return allActivities
        .map((activity) => ({
          wsPath: activity.data.wsPath,
          timestamp: activity.timestamp,
        }))
        .filter((item) => {
          if (seen.has(item.wsPath)) {
            return false;
          }
          seen.add(item.wsPath);
          return true;
        })
        .slice(0, this.maxRecentEntries);
    },
    (): Array<{ wsPath: string; timestamp: number }> => [],
    this.emitAppError,
  );

  $recentWsPaths = createAsyncAtom(
    async (get): Promise<string[]> => {
      await this.mountPromise;
      const wsName = get(this.workspaceState.$currentWsName);
      const wsPaths = get(this.workspaceState.$wsPaths);
      const wsPathsSet = new Set(wsPaths.map((path) => path.wsPath));

      if (!wsName) {
        return [];
      }

      const allRecentPaths = await get(this.$allRecentWsPaths);

      return allRecentPaths
        .filter((item) => wsPathsSet.has(item.wsPath))
        .map((item) => item.wsPath);
    },
    (): string[] => [],
    this.emitAppError,
  );

  $recentCommands = createAsyncAtom(
    async (get): Promise<string[]> => {
      await this.mountPromise;
      const wsName = get(this.workspaceState.$currentWsName);
      get(this.$refreshActivityCounter);

      if (!wsName) {
        return [];
      }

      const activities = await this.getRecent(wsName, 'command');
      const seen = new Set<string>();
      return activities
        .map((activity) => activity.data.commandId)
        .filter((commandId) => {
          if (seen.has(commandId)) {
            return false;
          }
          seen.add(commandId);
          return true;
        });
    },
    (): string[] => [],
    this.emitAppError,
  );

  $starredWsPaths = createAsyncAtom(
    async (get): Promise<string[]> => {
      await this.mountPromise;
      get(this.$starredItemsChangeCounter);
      const wsPaths = get(this.workspaceState.$wsPaths);
      const wsName = get(this.workspaceState.$currentWsName);
      if (wsPaths.length === 0 || !wsName) {
        return [];
      }
      const starredWsPaths =
        await this.starredItemManager.getStarredItems(wsName);
      return starredWsPaths;
    },
    () => [],
    this.emitAppError,
  );

  $isCurrentWsPathStarred = atom((get) => {
    const currentWsPath = get(this.workspaceState.$currentWsPath);
    if (!currentWsPath) {
      return false;
    }

    const starredPathsInCurrentWs = get(this.$starredWsPaths);
    return starredPathsInCurrentWs.includes(currentWsPath.wsPath);
  });

  resolveAtoms() {
    return {
      starredWsPaths: this.store.get(this.$starredWsPaths),
    };
  }

  get $timesAppLoaded() {
    if (!this.$_timesAppLoaded) {
      this.$_timesAppLoaded = atomStorage({
        serviceName: this.name,
        key: 'times-app-loaded',
        initValue: 0,
        syncDb: this.dep.syncDatabase,
        validator: T.Number,
        logger: this.logger,
      });
    }
    return this.$_timesAppLoaded;
  }

  constructor(
    context: BaseServiceContext,
    private dep: {
      workspaceState: WorkspaceStateService;
      workspaceOps: WorkspaceOpsService;
      syncDatabase: BaseSyncDatabaseService;
    },
    private config: {
      emitter: ScopedEmitter<'event::command:result'>;
      maxRecentEntries?: number;
      activityCooldownMs?: number;
    },
  ) {
    super(SERVICE_NAME.userActivityService, context, dep);
    this.starredItemManager = new StarredItemManager(
      this.dep.workspaceOps,
      this.dep.workspaceState,
      this.logger,
    );
  }

  postInstantiate(): void {
    const currentCount = this.store.get(this.$timesAppLoaded);
    this.store.set(this.$timesAppLoaded, currentCount + 1);

    this.maxRecentEntries =
      this.config.maxRecentEntries ?? DEFAULT_MAX_RECENT_ENTRIES;
    this.activityCooldownMs =
      this.config.activityCooldownMs ?? DEFAULT_ACTIVITY_COOLDOWN_MS;
  }

  hookMount() {
    this.config.emitter.on(
      'event::command:result',
      (result) => {
        this._recordCommandResult(result);
      },
      this.abortSignal,
    );

    this.addCleanup(
      this.store.sub(this.workspaceState.$currentWsPath, () => {
        const wsPath = this.store.get(this.workspaceState.$currentWsPath);
        this.logger.debug('Recording ws-path activity', wsPath);
        const wsName = wsPath?.wsName;
        if (!wsName) {
          return;
        }
        this.recordActivity(wsName, 'ws-path', { wsPath: wsPath.wsPath }).catch(
          (err) => this.logger.error(err),
        );
      }),
    );
  }

  public async getRecent<T extends EntityType>(
    wsName: string,
    entityType: T,
  ): Promise<ActivityLogEntry<T>[]> {
    await this.mountPromise;
    const activityLog = await this.getActivityLog(wsName);
    return activityLog.filter(
      (entry): entry is ActivityLogEntry<T> => entry.entityType === entityType,
    );
  }

  public async _recordCommandResult(result: CommandDispatchResult) {
    await this.mountPromise;
    // Skip if command is not visible in omni search
    if (!result.command.omniSearch) {
      return;
    }

    this.logger.debug('Recording command activity', result);
    const wsName = this.store.get(this.workspaceState.$currentWsName);

    // Skip if no workspace is active
    if (!wsName) {
      return;
    }

    this.logger.debug('Recording command activity', result);
    await this.recordActivity(wsName, 'command', {
      commandId: result.command.id,
    });
  }

  private get workspaceState() {
    return this.dep.workspaceState;
  }

  private get workspaceOps() {
    return this.dep.workspaceOps;
  }

  private static areActivitiesEqual<T extends EntityType>(
    data1: EntityData<T>,
    data2: EntityData<T>,
  ): boolean {
    return JSON.stringify(data1) === JSON.stringify(data2);
  }

  private async recordActivity<T extends EntityType>(
    wsName: string,
    entityType: T,
    data: InferType<(typeof EntityValidators)[T]>,
  ): Promise<void> {
    await this.mountPromise;

    if (!this.workspaceState.hasWorkspace(wsName)) {
      return;
    }

    const validationResult = EntityValidators[entityType].validate(data);
    if (!validationResult) {
      this.logger.warn(`Invalid data for entity type ${entityType}`, { data });

      throwAppError('error::user-activity:invalid-data', 'Invalid data type', {
        entityType: entityType,
      });
    }

    const lastSaved = await this.getLastSavedEntity(wsName, entityType);
    const now = Date.now();

    if (lastSaved) {
      // Skip if similar activity exists within cooldown period
      if (
        UserActivityService.areActivitiesEqual(lastSaved.data, data) &&
        now - lastSaved.timestamp < this.activityCooldownMs
      ) {
        this.logger.debug(
          `Skipping activity due to cooldown: ${entityType}`,
          data,
        );
        return;
      }
    }

    await this.setActivityLog(wsName, (existing) => {
      return [{ entityType, data, timestamp: now }, ...existing].slice(
        0,
        this.maxRecentEntries,
      );
    });

    this.store.set(this.$refreshActivityCounter, (c) => c + 1);
  }

  private async getActivityLog(wsName: string): Promise<ActivityLogEntry[]> {
    await this.mountPromise;

    if (!this.workspaceState.hasWorkspace(wsName)) {
      return [];
    }

    const existingLogs = this.activityLogCache.get(wsName);
    if (existingLogs) {
      return existingLogs;
    }

    const metadata = await this.workspaceOps.getWorkspaceMetadata(wsName);
    const result = metadata[ACTIVITY_LOG_KEY];

    const logs: ActivityLogEntry[] = Array.isArray(result) ? result : [];
    this.activityLogCache.set(wsName, logs);
    return logs;
  }

  private async setActivityLog(
    wsName: string,
    updateCallback: (logs: ActivityLogEntry[]) => ActivityLogEntry[],
  ): Promise<void> {
    await this.mountPromise;

    if (!this.workspaceState.hasWorkspace(wsName)) {
      return;
    }

    await this.workspaceOps.updateWorkspaceMetadata(wsName, (metadata) => {
      const result = metadata[ACTIVITY_LOG_KEY];
      const logs: ActivityLogEntry[] = Array.isArray(result) ? result : [];

      const updatedLogs = updateCallback(logs);
      this.activityLogCache.set(wsName, updatedLogs);

      return {
        ...metadata,
        [ACTIVITY_LOG_KEY]: updatedLogs,
      };
    });
  }

  private async getLastSavedEntity<T extends EntityType>(
    wsName: string,
    entityType: T,
  ): Promise<ActivityLogEntry<T> | undefined> {
    await this.mountPromise;
    const recentEntities = await this.getRecent(wsName, entityType);
    return recentEntities[0];
  }

  public async toggleStarItem(
    item: WsPath,
    desiredState?: boolean,
  ): Promise<void> {
    await this.mountPromise;
    await this.starredItemManager.toggleStarItem(item, desiredState);
    this.store.set(this.$starredItemsChangeCounter, (c) => c + 1);
  }
}

class StarredItemManager {
  private readonly logger: Logger;
  constructor(
    private readonly workspaceOps: WorkspaceOpsService,
    private readonly workspaceState: WorkspaceStateService,
    logger: Logger,
  ) {
    this.logger = logger.child('StarredItemManager');
  }

  private async _updateStarredItemsList(
    wsName: string,
    updateFn: (currentItems: string[]) => string[],
  ): Promise<void> {
    const { currentWsName, wsPaths } = this.workspaceState.resolveAtoms();
    if (currentWsName !== wsName) {
      this.logger.warn(
        `Current workspace ${currentWsName} does not match requested workspace ${wsName}.`,
      );
      return;
    }

    await this.workspaceOps.updateWorkspaceMetadata(wsName, (metadata) => {
      const wsPathsSet = new Set(wsPaths.map((path) => path.wsPath));
      let existingRawStarredItems = metadata[STARRED_ITEMS_KEY] ?? [];
      if (!Array.isArray(existingRawStarredItems)) {
        this.logger.error(
          `Invalid starred items metadata for ${wsName}. Expected array, got ${typeof existingRawStarredItems}.`,
        );
        existingRawStarredItems = [];
      }
      const newRawStarredItems = updateFn(existingRawStarredItems).filter(
        (item) => wsPathsSet.has(item),
      );
      this.logger.debug(
        `Persisting ${newRawStarredItems.length} starred item(s) in ${wsName}.`,
      );
      return {
        ...metadata,
        [STARRED_ITEMS_KEY]: newRawStarredItems,
      };
    });
  }

  async toggleStarItem(item: WsPath, desiredState?: boolean): Promise<void> {
    const { wsName, wsPath } = item;
    await this._updateStarredItemsList(wsName, (currentItems) => {
      const set = new Set(currentItems);
      const shouldBeStarred = desiredState ?? !set.has(wsPath);

      if (shouldBeStarred) {
        set.add(wsPath);
      } else {
        set.delete(wsPath);
      }
      return Array.from(set);
    });
  }

  async getStarredItems(wsName: string): Promise<string[]> {
    const metadata = await this.workspaceOps.getWorkspaceMetadata(wsName);
    const rawStarredItems = metadata[STARRED_ITEMS_KEY] ?? [];

    if (!Array.isArray(rawStarredItems)) {
      this.logger.error(
        `Invalid starred items metadata for ${wsName}. Expected array, got ${typeof rawStarredItems}.`,
      );
      return [];
    }

    const { wsPaths } = this.workspaceState.resolveAtoms();
    const existingWsPaths = new Set(wsPaths.map((p) => p.wsPath));
    const validStarredPaths: string[] = rawStarredItems.filter((item) =>
      existingWsPaths.has(item),
    );

    return validStarredPaths;
  }
}
