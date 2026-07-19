import {
  atomStorage,
  BaseService,
  type BaseServiceContext,
  isPrivacySafeErrorReport,
} from '@bangle.io/base-utils';
import {
  AUTOMATIC_ERROR_REPORTING_PREFERENCE_KEY,
  DATABASE_TABLE_NAME,
  SERVICE_NAME,
} from '@bangle.io/constants';
import { T } from '@bangle.io/mini-js-utils';
import type {
  BaseDatabaseService,
  BaseSyncDatabaseService,
  PrivacySafeErrorReport,
} from '@bangle.io/types';
import { atom, type PrimitiveAtom } from 'jotai';

const REPORT_KEY_PREFIX = 'privacy-safe-error-report:';
const MAX_PENDING_REPORTS = 50;

export class ErrorReportingService extends BaseService {
  static deps = ['database', 'syncDatabase'] as const;

  private $_automaticReportingEnabled: PrimitiveAtom<boolean> | undefined;
  readonly $pendingReportCount = atom(0);
  readonly $sendingReports = atom(false);

  constructor(
    context: BaseServiceContext,
    private dep: {
      database: BaseDatabaseService;
      syncDatabase: BaseSyncDatabaseService;
    },
  ) {
    super(SERVICE_NAME.errorReportingService, context, dep);
  }

  async hookMount(): Promise<void> {
    this.commonOptions.errorReporting.setManualReportHandler((report) =>
      this.persistReport(report),
    );
    await this.commonOptions.errorReporting.setAutomaticReportingEnabled(
      this.store.get(this.$automaticReportingEnabled),
    );
    await this.refreshPendingCount();

    this.addCleanup(
      () => this.commonOptions.errorReporting.setManualReportHandler(undefined),
      this.store.sub(this.$automaticReportingEnabled, () => {
        void this.commonOptions.errorReporting.setAutomaticReportingEnabled(
          this.store.get(this.$automaticReportingEnabled),
        );
      }),
    );

    this.dep.database.subscribe(
      { tableName: DATABASE_TABLE_NAME.misc },
      (change) => {
        if (change.key.startsWith(REPORT_KEY_PREFIX)) {
          void this.refreshPendingCount();
        }
      },
      this.abortSignal,
    );
  }

  get $automaticReportingEnabled(): PrimitiveAtom<boolean> {
    if (!this.$_automaticReportingEnabled) {
      this.$_automaticReportingEnabled = atomStorage({
        serviceName: this.name,
        key: AUTOMATIC_ERROR_REPORTING_PREFERENCE_KEY,
        initValue: true,
        syncDb: this.dep.syncDatabase,
        validator: T.Boolean,
        logger: this.logger,
      });
    }
    return this.$_automaticReportingEnabled;
  }

  async setAutomaticReportingEnabled(enabled: boolean): Promise<void> {
    await this.commonOptions.errorReporting.setAutomaticReportingEnabled(
      enabled,
    );
    this.store.set(this.$automaticReportingEnabled, enabled);
  }

  async sendPendingReports(): Promise<{ sent: number; remaining: number }> {
    if (this.store.get(this.$sendingReports)) {
      return {
        sent: 0,
        remaining: this.store.get(this.$pendingReportCount),
      };
    }

    this.store.set(this.$sendingReports, true);
    try {
      const reports = await this.getPendingReports();
      const { sentReportIds } =
        await this.commonOptions.errorReporting.sendReports(reports);
      await Promise.all(
        sentReportIds.map((id) =>
          this.dep.database.deleteEntry(this.getReportKey(id), {
            tableName: DATABASE_TABLE_NAME.misc,
          }),
        ),
      );
      await this.refreshPendingCount();
      return {
        sent: sentReportIds.length,
        remaining: this.store.get(this.$pendingReportCount),
      };
    } finally {
      this.store.set(this.$sendingReports, false);
    }
  }

  async clearPendingReports(): Promise<void> {
    const reports = await this.getPendingReports();
    await Promise.all(
      reports.map((report) =>
        this.dep.database.deleteEntry(this.getReportKey(report.id), {
          tableName: DATABASE_TABLE_NAME.misc,
        }),
      ),
    );
    await this.refreshPendingCount();
  }

  private async persistReport(report: PrivacySafeErrorReport): Promise<void> {
    if (!isPrivacySafeErrorReport(report)) {
      return;
    }

    await this.dep.database.updateEntry(
      this.getReportKey(report.id),
      () => ({ value: report }),
      { tableName: DATABASE_TABLE_NAME.misc },
    );
    await this.prunePendingReports();
    await this.refreshPendingCount();
  }

  private async getPendingReports(): Promise<PrivacySafeErrorReport[]> {
    const entries = await this.dep.database.getAllEntries({
      tableName: DATABASE_TABLE_NAME.misc,
    });
    return entries
      .filter(isPrivacySafeErrorReport)
      .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  }

  private async prunePendingReports(): Promise<void> {
    const reports = await this.getPendingReports();
    const excess = reports.length - MAX_PENDING_REPORTS;
    if (excess <= 0) {
      return;
    }
    await Promise.all(
      reports.slice(0, excess).map((report) =>
        this.dep.database.deleteEntry(this.getReportKey(report.id), {
          tableName: DATABASE_TABLE_NAME.misc,
        }),
      ),
    );
  }

  private async refreshPendingCount(): Promise<void> {
    this.store.set(
      this.$pendingReportCount,
      (await this.getPendingReports()).length,
    );
  }

  private getReportKey(id: string): string {
    return `${REPORT_KEY_PREFIX}${id}`;
  }
}
