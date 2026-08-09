import { type BaseError, createAppError } from '@bangle.io/base-utils';

type CompensatedFileBatchEntry = Readonly<{
  destinationWsPath?: string;
  sourceWsPath: string;
}>;

type CompensatedFileBatchRollbackFailure = Readonly<{
  entry: CompensatedFileBatchEntry;
  error: unknown;
}>;

type AppliedFileBatchOutcome = Readonly<{
  appliedEntries: readonly CompensatedFileBatchEntry[];
  status: 'applied';
}>;

type RolledBackFileBatchOutcome = Readonly<{
  appliedEntries: readonly CompensatedFileBatchEntry[];
  primaryError: unknown;
  status: 'rolled-back';
}>;

export type ResidualFileBatchOutcome = Readonly<{
  appliedEntries: readonly CompensatedFileBatchEntry[];
  primaryError: unknown;
  residualEntries: readonly CompensatedFileBatchEntry[];
  rollbackFailures: readonly CompensatedFileBatchRollbackFailure[];
  status: 'residual-uncertainty';
}>;

export type CompensatedFileBatchOutcome =
  | AppliedFileBatchOutcome
  | ResidualFileBatchOutcome
  | RolledBackFileBatchOutcome;

export type FileBatchCompensationResult =
  | Readonly<{ status: 'restored' }>
  | Readonly<{ error: unknown; status: 'uncertain' }>;

type CompensatedFileBatchConfig<TEntry> = {
  apply: (entry: TEntry) => Promise<void>;
  compensate: (entry: TEntry) => Promise<FileBatchCompensationResult>;
  describe: (entry: TEntry) => CompensatedFileBatchEntry;
};

async function compensateAppliedEntries<TEntry>(
  failedEntry: TEntry,
  appliedEntries: readonly TEntry[],
  primaryError: unknown,
  config: CompensatedFileBatchConfig<TEntry>,
): Promise<CompensatedFileBatchOutcome> {
  const rollbackFailures: CompensatedFileBatchRollbackFailure[] = [];
  const residualEntries: CompensatedFileBatchEntry[] = [];

  // The provider may mutate and then reject, so assess the failed entry before
  // reversing operations whose promises definitely fulfilled.
  const compensationEntries = [failedEntry, ...[...appliedEntries].reverse()];
  for (const entry of compensationEntries) {
    const describedEntry = config.describe(entry);

    try {
      const result = await config.compensate(entry);
      if (result.status === 'uncertain') {
        residualEntries.push(describedEntry);
        rollbackFailures.push({ entry: describedEntry, error: result.error });
      }
    } catch (error) {
      residualEntries.push(describedEntry);
      rollbackFailures.push({ entry: describedEntry, error });
    }
  }

  const describedAppliedEntries = appliedEntries.map(config.describe);
  if (rollbackFailures.length === 0) {
    return {
      appliedEntries: describedAppliedEntries,
      primaryError,
      status: 'rolled-back',
    };
  }

  return {
    appliedEntries: describedAppliedEntries,
    primaryError,
    residualEntries,
    rollbackFailures,
    status: 'residual-uncertainty',
  };
}

/**
 * Applies entries in order and compensates both the failed attempt and every
 * completed entry in reverse order. It reports outcomes rather than emitting
 * events or throwing so FileSystemService owns propagation policy.
 */
export async function runCompensatedFileBatch<TEntry>(
  entries: readonly TEntry[],
  config: CompensatedFileBatchConfig<TEntry>,
): Promise<CompensatedFileBatchOutcome> {
  const appliedEntries: TEntry[] = [];

  for (const entry of entries) {
    try {
      await config.apply(entry);
      appliedEntries.push(entry);
    } catch (primaryError) {
      return compensateAppliedEntries(
        entry,
        appliedEntries,
        primaryError,
        config,
      );
    }
  }

  return {
    appliedEntries: appliedEntries.map(config.describe),
    status: 'applied',
  };
}

export type CompensatedFileBatchError = BaseError & {
  readonly batchOutcome: ResidualFileBatchOutcome;
};

function errorForAppRouting(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error('A file storage provider rejected with a non-Error value', {
    cause: error,
  });
}

export function createCompensatedFileBatchError(
  outcome: ResidualFileBatchOutcome,
  operation: 'delete' | 'rename',
  wsName?: string,
): CompensatedFileBatchError {
  return Object.assign(
    createAppError(
      'error::file:batch-recovery-uncertain',
      `Unable to fully recover a failed ${operation} batch`,
      {
        operation,
        primaryError: errorForAppRouting(outcome.primaryError),
        residualCount: outcome.residualEntries.length,
        rollbackFailureCount: outcome.rollbackFailures.length,
        wsName,
      },
    ),
    { batchOutcome: outcome },
  );
}
