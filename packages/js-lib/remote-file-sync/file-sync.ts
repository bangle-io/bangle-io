import { match } from 'ts-pattern';

import { handleTriState, TriState } from '@bangle.io/tri-state';

export interface FileSyncObj {
  readonly uid: string;
  readonly sha: string;
  readonly deleted?: number;
}

const NOOP = { action: 'noop' as const, target: undefined };
const CONFLICT = { action: 'conflict' as const, target: undefined };

function fileEqual<R extends { sha: string }>(a?: R, b?: R): TriState {
  if (a && b) {
    return a.sha === b.sha ? TriState.Yes : TriState.No;
  }

  return TriState.Unknown;
}

function isModifiedWrtAncestor<R extends { sha: string }>({
  fileEntry,
  ancestorFileEntry,
}: {
  fileEntry: R | undefined;
  ancestorFileEntry: R | undefined;
}): TriState {
  const res = fileEqual(fileEntry, ancestorFileEntry);

  return handleTriState(res, {
    onYes: () => TriState.No,
    onNo: () => TriState.Yes,
    onUnknown: () => TriState.Unknown,
  });
}

/**
 * Definitions:
 * - Undefined: A file doesn't exist after looking back some amount of history.
 * - Defined: A file existed though it may or may not be deleted depending on the `deleted` field.
 *
 * Case A: Both files are defined and are equal
 * Case B: Both files are undefined
 * Case C: One of files is undefined
 * Case D: Files are different
 */
export function fileSync<T extends FileSyncObj>({
  fileA,
  fileB,
  ancestor,
}: {
  fileA: T | undefined;
  fileB: T | undefined;
  ancestor: T | undefined;
}):
  | { action: 'noop'; target: undefined }
  | {
      action: 'conflict';
      target: undefined;
    }
  | {
      action: 'delete';
      // the target identifier to take action on
      target: 'fileA' | 'fileB';
    }
  | {
      action: 'set';
      // the target identifier to take action on
      target: 'fileA' | 'fileB' | 'ancestor';
    } {
  // Case A: Both files are defined and are equal
  if (
    fileA &&
    fileB &&
    fileA.sha === fileB.sha &&
    fileA.deleted === undefined &&
    fileB.deleted === undefined
  ) {
    // Its not expected the ancestor to be different
    // when both fileA and fileB have the same sha. This
    // can only happen if the ancestor failed to be updated.
    // This if condition handles that case and suggests
    // to fix it.
    if (ancestor && fileA.sha !== ancestor.sha) {
      return {
        action: 'set' as const,
        target: 'ancestor' as const,
      };
    }

    return NOOP;
  }

  // Case B: Both files are undefined
  else if (!fileA && !fileB) {
    return NOOP;
  }

  // Case C: fileEntryA is undefined
  else if (!fileA && fileB) {
    return syncOneIsDefined(fileB, 'fileB', 'fileA');
  }
  // Case C: fileEntryB is undefined
  else if (fileA && !fileB) {
    return syncOneIsDefined(fileA, 'fileA', 'fileB');
  }

  // Case D files are both defined
  else if (fileA && fileB) {
    return syncBothAreDefined(fileA, fileB, ancestor);
  }

  // Our cases above should be exhaustive i.e. it should
  // not be possible to hit this condition unless we introduce a bug
  // in our logic.
  else {
    throw new Error('impossible file-sync condition');
  }
}

function syncBothAreDefined<T extends FileSyncObj>(
  fileEntryA: T,
  fileEntryB: T,
  ancestorFileEntry?: T | undefined,
) {
  // Case D.2 ancestorFileEntry is not defined
  if (!ancestorFileEntry) {
    // this happens when a new file is created
    // at both places at the same time
    return CONFLICT;
  }

  // Case D.1 ancestorFileEntry is defined
  enum FileState {
    NoChange = 'NoChange',
    Modified = 'Modified',
    Deleted = 'Deleted',
  }

  const getFileState = ({
    fileEntry,
    ancestorFileEntry,
  }: {
    fileEntry: T;
    ancestorFileEntry: T;
  }): FileState => {
    if (fileEntry.deleted) {
      return FileState.Deleted;
    }

    const isModified = isModifiedWrtAncestor({
      ancestorFileEntry,
      fileEntry,
    });

    return handleTriState(isModified, {
      onYes: () => {
        return FileState.Modified;
      },
      onNo: () => {
        return FileState.NoChange;
      },
      onUnknown: () => {
        throw new Error('Invalid file state');
      },
    });
  };

  const fileStateA = getFileState({
    fileEntry: fileEntryA,
    ancestorFileEntry: ancestorFileEntry,
  });
  const fileStateB = getFileState({
    fileEntry: fileEntryB,
    ancestorFileEntry: ancestorFileEntry,
  });
  /**
   * The following table talks about change w.r.t
   * to the ancestor file.
   * | FileA\B   | No Change | Modified | Deleted |
   * | --------- | --------- | ------- | ------  |
   * | No Change |   D.1.1   |  D.1.2  |  D.1.3  |
   * | Modified   |   D.1.4   |  D.1.5  |  D.1.6  |
   * | Deleted   |   D.1.7   |  D.1.8  |  D.1.9  |
   */

  return (
    match<[FileState, FileState]>([fileStateA, fileStateB])
      // Case D.1.1
      .with([FileState.NoChange, FileState.NoChange], () => {
        return NOOP;
      })
      // Case D.1.2
      .with([FileState.NoChange, FileState.Modified], () => {
        // update target A to match it with fileB
        return {
          action: 'set' as const,
          target: 'fileA' as const,
        };
      })
      // Case D.1.3
      .with([FileState.NoChange, FileState.Deleted], () => {
        return {
          action: 'delete' as const,
          target: 'fileA' as const,
        };
      })
      // Case D.1.4
      .with([FileState.Modified, FileState.NoChange], () => {
        return {
          action: 'set' as const,
          target: 'fileB' as const,
        };
      })
      // Case D.1.5
      .with([FileState.Modified, FileState.Modified], () => {
        return CONFLICT;
      })
      // Case D.1.6
      .with([FileState.Modified, FileState.Deleted], () => {
        return {
          action: 'set' as const,
          target: 'fileB' as const,
        };
      })
      // Case D.1.7
      .with([FileState.Deleted, FileState.NoChange], () => {
        return {
          action: 'delete' as const,
          target: 'fileB' as const,
        };
      })
      // Case D.1.8
      .with([FileState.Deleted, FileState.Modified], () => {
        return {
          action: 'set' as const,
          target: 'fileA' as const,
        };
      })
      // Case D.1.9
      .with([FileState.Deleted, FileState.Deleted], () => {
        return NOOP;
      })
      .exhaustive()
  );
}

function syncOneIsDefined<T extends FileSyncObj>(
  // fileEntryX is the fileEntry that is defined
  fileEntryX: T,
  fileIdentifierX: 'fileA' | 'fileB',
  // Y is the fileEntry that is undefined
  fileIdentifierY: 'fileA' | 'fileB',
) {
  // All wrt to ancestor file
  // Case C:
  //      C.1 Deleted
  //      C.2 No Change
  //      C.3 Modified
  //      C.4 Created

  // C.1 if file is deleted, do nothing as the Y location
  // file is undefined.
  if (fileEntryX.deleted) {
    return NOOP;
  }

  // for anything other than deleted we want to
  // update the fileY no matter what ancestor.
  return {
    action: 'set' as const,
    target: fileIdentifierY,
  };
}
