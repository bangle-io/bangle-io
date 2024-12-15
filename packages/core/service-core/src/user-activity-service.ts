import {
  BaseService,
  type BaseServiceContext,
  throwAppError,
} from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import { type InferType, T } from '@bangle.io/mini-zod';
import type { CommandDispatchResult, ScopedEmitter } from '@bangle.io/types';
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

type RecentWsPathInfo = {
  wsPath: string;
  timestamp: number;
  wsName: string;
};

/**
 * Tracks user activities like recent workspaces and commands executed
 */
export class UserActivityService extends BaseService {
  static deps = ['workspaceState', 'workspaceOps'] as const;

  private activityLogCache: Map<string, ActivityLogEntry[]> = new Map();
  private maxRecentEntries!: number;
  private activityCooldownMs!: number;
  private $refreshActivityCounter = atom(0);

  $allRecentWsPaths = unwrap(
    atom(async (get): Promise<Array<{ wsPath: string; timestamp: number }>> => {
      await this.mountPromise;
      get(this.$refreshActivityCounter);

      // Get all workspaces
      const workspaces = await this.workspaceOps.getAllWorkspaces();

      // Collect recent paths from all workspaces
      const allActivities: ActivityLogEntry<'ws-path'>[] = [];

      for (const workspace of workspaces) {
        const activities = await this.getRecent(workspace.name, 'ws-path');
        allActivities.push(...activities);
      }

      // Sort by timestamp descending
      allActivities.sort((a, b) => b.timestamp - a.timestamp);

      // Filter unique paths
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
    }),
    () => [],
  );

  $recentWsPaths = unwrap(
    atom(async (get): Promise<string[]> => {
      await this.mountPromise;
      const wsName = get(this.workspaceState.$wsName);
      const wsPaths = get(this.workspaceState.$wsPaths);
      const wsPathsSet = new Set(wsPaths);

      // If no workspace is active, return empty array
      if (!wsName) {
        return [];
      }

      // Get all recent paths
      const allRecentPaths = await get(this.$allRecentWsPaths);

      // Filter to only include paths from current workspace and existing files
      return allRecentPaths
        .filter((item) => wsPathsSet.has(item.wsPath))
        .map((item) => item.wsPath);
    }),
    () => [],
  );

  $recentCommands = unwrap(
    atom(async (get): Promise<string[]> => {
      await this.mountPromise;
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
    context: BaseServiceContext,
    private dep: {
      workspaceState: WorkspaceStateService;
      workspaceOps: WorkspaceOpsService;
    },
    private config: {
      emitter: ScopedEmitter<'event::command:result'>;
      maxRecentEntries?: number;
      activityCooldownMs?: number;
    },
  ) {
    super(SERVICE_NAME.userActivityService, context, dep);
  }

  postInstantiate(): void {
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
      this.store.sub(this.workspaceState.$wsPath, () => {
        const wsPath = this.store.get(this.workspaceState.$wsPath);
        this.logger.debug('Recording ws-path activity', wsPath);
        const wsName = wsPath && getWsName(wsPath);
        if (!wsName) {
          return;
        }
        this.recordActivity(wsName, 'ws-path', { wsPath }).catch((err) =>
          this.logger.error(err),
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
    const wsName = this.store.get(this.workspaceState.$wsName);

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
}
