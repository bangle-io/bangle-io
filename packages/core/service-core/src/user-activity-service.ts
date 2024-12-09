import { BaseService, throwAppError } from '@bangle.io/base-utils';
import { type InferType, T } from '@bangle.io/mini-zod';
import type {
  BaseServiceCommonOptions,
  CommandDispatchResult,
  ScopedEmitter,
} from '@bangle.io/types';
import { getWsName } from '@bangle.io/ws-path';
import { atom } from 'jotai';
import { unwrap } from 'jotai/utils';
import type { WorkspaceOpsService } from './workspace-ops-service';
import type { WorkspaceStateService } from './workspace-state-service';

const DEFAULT_MAX_RECENT_ENTRIES = 10;
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

export class UserActivityService extends BaseService {
  private workspaceState: WorkspaceStateService;
  private workspaceOps: WorkspaceOpsService;

  private activityLogCache: Map<string, ActivityLogEntry[]> = new Map();
  private maxRecentEntries: number;
  private activityCooldownMs: number;
  private $refreshActivityCounter = atom(0);

  $recentWsPaths = unwrap(
    atom(async (get): Promise<string[]> => {
      const wsName = get(this.workspaceState.$wsName);
      const wsPaths = get(this.workspaceState.$wsPaths);
      const wsPathsSet = new Set(wsPaths);
      // trigger refresh when counter changes

      get(this.$refreshActivityCounter);

      if (!wsName) {
        return [];
      }

      const activities = await this.getRecent(wsName, 'ws-path');
      const seen = new Set<string>();
      return activities
        .map((activity) => activity.data.wsPath)
        .filter((wsPath) => {
          if (!wsPathsSet.has(wsPath) || seen.has(wsPath)) {
            return false;
          }
          seen.add(wsPath);
          return true;
        });
    }),
    () => [],
  );

  $recentCommands = unwrap(
    atom(async (get): Promise<string[]> => {
      const wsName = get(this.workspaceState.$wsName);
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
    }),
    () => [],
  );

  constructor(
    baseOptions: BaseServiceCommonOptions,
    dependencies: {
      workspaceState: WorkspaceStateService;
      workspaceOps: WorkspaceOpsService;
    },
    private options: {
      emitter: ScopedEmitter<'event::command:result'>;
      maxRecentEntries?: number;
      activityCooldownMs?: number;
    },
  ) {
    super({
      ...baseOptions,
      name: 'user-activity',
      kind: 'core',
      dependencies,
    });
    this.workspaceState = dependencies.workspaceState;
    this.workspaceOps = dependencies.workspaceOps;

    this.maxRecentEntries =
      options.maxRecentEntries ?? DEFAULT_MAX_RECENT_ENTRIES;
    this.activityCooldownMs =
      options.activityCooldownMs ?? DEFAULT_ACTIVITY_COOLDOWN_MS;
  }

  protected async hookOnInitialize(): Promise<void> {
    this.options.emitter.on(
      'event::command:result',
      (result) => {
        this._recordCommandResult(result);
      },
      this.abortSignal,
    );

    this.addCleanup(
      this.store.sub(this.workspaceState.$wsPath, () => {
        const wsPath = this.store.get(this.workspaceState.$wsPath);
        this.logger.debug('Recording ws-path activity', wsPath);
        const wsName = wsPath && getWsName(wsPath);
        if (!wsName) {
          return;
        }
        this.recordActivity(wsName, 'ws-path', { wsPath });
      }),
    );
  }

  protected async hookOnDispose(): Promise<void> {
    this.activityLogCache.clear();
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
    await this.initializedPromise;
    if (!EntityValidators[entityType].validate(data)) {
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
    await this.initializedPromise;
    const existingLogs = this.activityLogCache.get(wsName);
    if (existingLogs) {
      return existingLogs;
    }

    const metadata = await this.workspaceOps.getWorkspaceMetadata(wsName);
    const result = metadata[ACTIVITY_LOG_KEY];

    const logs: ActivityLogEntry[] = Array.isArray(result) ? result : [];
    // Cache the results
    this.activityLogCache.set(wsName, logs);

    return logs;
  }

  private async setActivityLog(
    wsName: string,
    updateCallback: (logs: ActivityLogEntry[]) => ActivityLogEntry[],
  ): Promise<void> {
    await this.initializedPromise;
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
    await this.initializedPromise;
    const recentEntities = await this.getRecent(wsName, entityType);
    return recentEntities[0];
  }

  async _recordCommandResult(result: CommandDispatchResult) {
    await this.initializedPromise;

    // Skip if command is not available in omni search, as it's not user initiated
    if (!result.command.omniSearch) {
      return;
    }

    this.logger.debug('Recording command activity', result);
    const wsName = this.store.get(this.workspaceState.$wsName);

    // Skip if no workspace is active
    if (!wsName) {
      return;
    }

    this.logger.warn('Recording command activity', result);
    await this.recordActivity(wsName, 'command', {
      commandId: result.command.id,
    });
  }

  public async getRecent<T extends EntityType>(
    wsName: string,
    entityType: T,
  ): Promise<ActivityLogEntry<T>[]> {
    await this.initializedPromise;
    const activityLog = await this.getActivityLog(wsName);

    return activityLog.filter(
      (entry): entry is ActivityLogEntry<T> => entry.entityType === entityType,
    );
  }
}
