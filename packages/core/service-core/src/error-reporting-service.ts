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
  private manualReportPromptQueue: PrivacySafeErrorReport[] = [];
  private reportPersistenceChain: Promise<void> = Promise.resolve();
  readonly $manualReportPrompt = atom<PrivacySafeErrorReport | undefined>(
    undefined,
  );
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
      this.queueReportPersistence(report),
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
        initValue:
          this.commonOptions.errorReporting.getAutomaticReportingEnabled(),
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
    if (enabled) {
      this.manualReportPromptQueue = [];
      this.store.set(this.$manualReportPrompt, undefined);
    }
  }

  dismissManualReportPrompt(reportId: string): void {
    this.clearManualReportPrompt(reportId);
  }

  async sendPendingReport(reportId: string): Promise<boolean> {
    if (this.store.get(this.$sendingReports)) {
      return false;
    }

    this.store.set(this.$sendingReports, true);
    try {
      await this.reportPersistenceChain;
      const report = await this.getPendingReport(reportId);
      if (!report) {
        this.clearManualReportPrompt(reportId);
        return false;
      }
      const { sentReportIds } =
        await this.commonOptions.errorReporting.sendReports([report]);
      if (!sentReportIds.includes(reportId)) {
        return false;
      }
      await this.deletePendingReport(reportId);
      return true;
    } finally {
      this.store.set(this.$sendingReports, false);
    }
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
      await this.reportPersistenceChain;
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
      for (const id of sentReportIds) {
        this.clearManualReportPrompt(id);
      }
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
    await this.reportPersistenceChain;
    const reports = await this.getPendingReports();
    await Promise.all(
      reports.map((report) =>
        this.dep.database.deleteEntry(this.getReportKey(report.id), {
          tableName: DATABASE_TABLE_NAME.misc,
        }),
      ),
    );
    this.manualReportPromptQueue = [];
    this.store.set(this.$manualReportPrompt, undefined);
    await this.refreshPendingCount();
  }

  async deletePendingReport(reportId: string): Promise<void> {
    await this.reportPersistenceChain;
    await this.dep.database.deleteEntry(this.getReportKey(reportId), {
      tableName: DATABASE_TABLE_NAME.misc,
    });
    this.clearManualReportPrompt(reportId);
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
    if (!this.store.get(this.$automaticReportingEnabled)) {
      this.enqueueManualReportPrompt(report);
    }
  }

  private queueReportPersistence(
    report: PrivacySafeErrorReport,
  ): Promise<void> {
    const persistence = this.reportPersistenceChain.then(() =>
      this.persistReport(report),
    );
    this.reportPersistenceChain = persistence.catch(() => {});
    return persistence;
  }

  private clearManualReportPrompt(reportId: string): void {
    if (this.store.get(this.$manualReportPrompt)?.id !== reportId) {
      this.manualReportPromptQueue = this.manualReportPromptQueue.filter(
        (report) => report.id !== reportId,
      );
      return;
    }
    this.store.set(
      this.$manualReportPrompt,
      this.manualReportPromptQueue.shift(),
    );
  }

  private enqueueManualReportPrompt(report: PrivacySafeErrorReport): void {
    if (
      this.store.get(this.$manualReportPrompt)?.id === report.id ||
      this.manualReportPromptQueue.some((queued) => queued.id === report.id)
    ) {
      return;
    }
    if (!this.store.get(this.$manualReportPrompt)) {
      this.store.set(this.$manualReportPrompt, report);
      return;
    }
    this.manualReportPromptQueue.push(report);
  }

  private async getPendingReport(
    reportId: string,
  ): Promise<PrivacySafeErrorReport | undefined> {
    const entry = await this.dep.database.getEntry(
      this.getReportKey(reportId),
      { tableName: DATABASE_TABLE_NAME.misc },
    );
    return entry.found && isPrivacySafeErrorReport(entry.value)
      ? entry.value
      : undefined;
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
    const reportsToPrune = reports.slice(0, excess);
    await Promise.all(
      reportsToPrune.map((report) =>
        this.dep.database.deleteEntry(this.getReportKey(report.id), {
          tableName: DATABASE_TABLE_NAME.misc,
        }),
      ),
    );
    for (const report of reportsToPrune) {
      this.clearManualReportPrompt(report.id);
    }
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
