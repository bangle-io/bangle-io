import { BaseService, throwAppError } from '@bangle.io/base-utils';
import { type InferType, T } from '@bangle.io/mini-zod';
import type {
  BaseDatabaseService,
  BaseServiceCommonOptions,
} from '@bangle.io/types';
import { getWsName } from '@bangle.io/ws-path';
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

export class UserActivityService extends BaseService {
  private workspaceState: WorkspaceStateService;
  private workspaceOps: WorkspaceOpsService;
  private activityLogKey = 'ws-activity';
  private activityLogCache: Map<string, ActivityLogEntry[]> = new Map();
  private maxRecentEntries: number;
  private activityCooldownMs: number;

  constructor(
    baseOptions: BaseServiceCommonOptions,
    dependencies: {
      workspaceState: WorkspaceStateService;
      workspaceOps: WorkspaceOpsService;
    },
    options: {
      maxRecentEntries?: number;
      activityCooldownMs?: number;
    } = {},
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

  protected async onInitialize(): Promise<void> {
    this.addCleanup(
      this.store.sub(this.workspaceState.$wsPath, () => {
        this.logger.debug('Recording ws-path activity');
        const wsPath = this.store.get(this.workspaceState.$wsPath);
        const wsName = wsPath && getWsName(wsPath);
        if (!wsName) {
          return;
        }
        this.recordActivity(wsName, 'ws-path', { wsPath });
      }),
    );
  }

  protected async onDispose(): Promise<void> {
    this.activityLogCache.clear();
    // ...existing code...
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
  }

  private async getActivityLog(wsName: string): Promise<ActivityLogEntry[]> {
    const existingLogs = this.activityLogCache.get(wsName);
    if (existingLogs) {
      return existingLogs;
    }

    const metadata = await this.workspaceOps.getWorkspaceMetadata(wsName);
    const result = metadata[this.activityLogKey];

    const logs: ActivityLogEntry[] = Array.isArray(result) ? result : [];
    // Cache the results
    this.activityLogCache.set(wsName, logs);

    return logs;
  }

  private async setActivityLog(
    wsName: string,
    updateCallback: (logs: ActivityLogEntry[]) => ActivityLogEntry[],
  ): Promise<void> {
    await this.workspaceOps.updateWorkspaceMetadata(wsName, (metadata) => {
      const result = metadata[this.activityLogKey];
      const logs: ActivityLogEntry[] = Array.isArray(result) ? result : [];

      const updatedLogs = updateCallback(logs);
      this.activityLogCache.set(wsName, updatedLogs);

      return {
        ...metadata,
        [this.activityLogKey]: updatedLogs,
      };
    });
  }

  public async getRecent<T extends EntityType>(
    wsName: string,
    entityType: T,
  ): Promise<ActivityLogEntry<T>[]> {
    const activityLog = await this.getActivityLog(wsName);

    return activityLog.filter(
      (entry): entry is ActivityLogEntry<T> => entry.entityType === entityType,
    );
  }

  private async getLastSavedEntity<T extends EntityType>(
    wsName: string,
    entityType: T,
  ): Promise<ActivityLogEntry<T> | undefined> {
    const recentEntities = await this.getRecent(wsName, entityType);
    return recentEntities[0];
  }
}
