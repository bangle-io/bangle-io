import { match } from 'ts-pattern';

export interface SyncFileEntry {
  readonly uid: string;
  readonly sha: string;
  readonly file: File;
  readonly deleted: number | undefined;
}

const fileEqual = (
  a?: SyncFileEntry,
  b?: SyncFileEntry,
): boolean | undefined => {
  if (a && b) {
    return a.sha === b.sha;
  }

  return undefined;
};

const isModifiedWrtAncestor = ({
  fileEntry,
  ancestorFileEntry,
}: {
  fileEntry: SyncFileEntry;
  ancestorFileEntry: SyncFileEntry;
}) => {
  const res = fileEqual(fileEntry, ancestorFileEntry);

  if (typeof res === 'boolean') {
    return !res;
  }

  return undefined;
};

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
export async function fileSync<T extends SyncFileEntry>(
  fileEntryA?: T,
  fileEntryB?: T,
  ancestorFileEntry?: T,
): Promise<
  | undefined
  | {
      action: 'conflict';
    }
  | {
      action: 'delete';
      // the target identifier to take action on
      target: 'fileA' | 'fileB';
    }
  | {
      action: 'set';
      // the target identifier to take action on
      target: 'fileA' | 'fileB';
      // the file value to use witht the action
      file: File;
    }
> {
  // Case A: Both files are defined and are equal
  if (fileEntryA && fileEntryB && fileEntryA.sha === fileEntryB.sha) {
    return undefined;
  }

  // Case B: Both files are undefined
  else if (!fileEntryA && !fileEntryB) {
    return undefined;
  }

  // Case C: fileEntryA is undefined
  else if (!fileEntryA && fileEntryB) {
    return syncOneIsDefined(fileEntryB, 'fileB', 'fileA');
  }
  // Case C: fileEntryB is undefined
  else if (fileEntryA && !fileEntryB) {
    return syncOneIsDefined(fileEntryA, 'fileA', 'fileB');
  }

  // Case D files are both defined
  else if (fileEntryA && fileEntryB) {
    return syncBothAreDefined(fileEntryA, fileEntryB, ancestorFileEntry);
  }

  // Our cases above should be exhaustive i.e. it should
  // not be possible to hit this condition unless we introduce a bug
  // in our logic.
  else {
    throw new Error('impossible file-sync condition');
  }
}

async function syncBothAreDefined(
  fileEntryA: SyncFileEntry,
  fileEntryB: SyncFileEntry,
  ancestorFileEntry?: SyncFileEntry | undefined,
) {
  // Case D.2 ancestorFileEntry is not defined
  if (!ancestorFileEntry) {
    // this happens when a new file is created
    // at both places at the same time
    return {
      action: 'conflict' as const,
    };
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
    fileEntry: SyncFileEntry;
    ancestorFileEntry: SyncFileEntry;
  }): FileState => {
    if (fileEntry.deleted) {
      return FileState.Deleted;
    }

    const isModified = isModifiedWrtAncestor({
      ancestorFileEntry,
      fileEntry,
    });

    if (isModified === true) {
      return FileState.Modified;
    } else if (isModified === false) {
      return FileState.NoChange;
    } else {
      throw new Error('Invalid file state');
    }
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
        return undefined;
      })
      // Case D.1.2
      .with([FileState.NoChange, FileState.Modified], () => {
        // update target A to match it with fileB
        return {
          action: 'set' as const,
          file: fileEntryB.file,
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
          file: fileEntryA.file,
          target: 'fileB' as const,
        };
      })
      // Case D.1.5
      .with([FileState.Modified, FileState.Modified], () => {
        return {
          action: 'conflict' as const,
        };
      })
      // Case D.1.6
      .with([FileState.Modified, FileState.Deleted], () => {
        return {
          action: 'set' as const,
          file: fileEntryA.file,
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
          file: fileEntryB.file,
          target: 'fileA' as const,
        };
      })
      // Case D.1.9
      .with([FileState.Deleted, FileState.Deleted], () => {
        return undefined;
      })
      .exhaustive()
  );
}

async function syncOneIsDefined(
  // fileEntryX is the fileEntry that is defined
  fileEntryX: SyncFileEntry,
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
    return undefined;
  }

  // for anything other than deleted we want to
  // update the fileY no matter what ancestor.
  return {
    action: 'set' as const,
    file: fileEntryX.file,
    target: fileIdentifierY,
  };
}
