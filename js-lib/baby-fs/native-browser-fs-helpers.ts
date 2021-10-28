interface FSHandle {
  readonly name: string;

  isSameEntry: (other: FSHandle) => Promise<boolean>;

  queryPermission: (
    descriptor?: FileSystemHandlePermissionDescriptor,
  ) => Promise<PermissionState>;
  requestPermission: (
    descriptor?: FileSystemHandlePermissionDescriptor,
  ) => Promise<PermissionState>;
}

export interface FileTypeSystemHandle extends FSHandle {
  readonly kind: 'file';
  getFile(): Promise<File>;
}

export interface DirTypeSystemHandle extends FSHandle {
  readonly kind: 'directory';
  values(): FileSystemHandle[];
  removeEntry(name: string): void;
}

type FileSystemHandle = FileTypeSystemHandle | DirTypeSystemHandle;

export interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

export async function createFile(rootDirHandle, path) {
  if (typeof path === 'string') {
    path = path.split('/');
  }

  const recurse = async (path, dirHandle) => {
    const [parentName, ...rest] = path;

    if (path.length === 1) {
      return dirHandle.getFileHandle(parentName, { create: true });
    }

    const newHandle = await dirHandle.getDirectoryHandle(parentName, {
      create: true,
    });

    return recurse(rest, newHandle);
  };

  if (path[0] !== rootDirHandle.name) {
    throw new Error(
      `getFile Error: root parent ${path[0]} must be the rootDirHandle ${rootDirHandle.name}`,
    );
  }
  return recurse(path.slice(1), rootDirHandle);
}

export async function writeFile(fileHandle, contents) {
  // Support for Chrome 82 and earlier.
  if (fileHandle.createWriter) {
    // Create a writer (request permission if necessary).
    const writer = await fileHandle.createWriter();
    // Write the full length of the contents
    await writer.write(0, contents);
    // Close the file and write the contents to disk
    await writer.close();
    return;
  }
  // For Chrome 83 and later.
  // Create a FileSystemWritableFileStream to write to.
  const writable = await fileHandle.createWritable();

  // TODO this throws a promise rejection internally, not sure
  // if this the root cause of the crswap issue
  // Write the contents of the file to the stream.
  await writable.write(contents);

  // Close the file and write the contents to disk.
  await writable.close();
}

export function readFileAsText(file): Promise<string> {
  // If the new .text() reader is available, use it.
  if (file.text) {
    return file.text();
  }
  // Otherwise use the traditional file reading technique.
  return _readFileLegacy(file);
}

/**
 * Reads the raw text from a file.
 *
 * @private
 * @param {File} file
 * @return {Promise<string>} A promise that resolves to the parsed string.
 */
function _readFileLegacy(file): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', (e) => {
      const text = (e?.srcElement as any)?.result;
      resolve(text);
    });
    reader.readAsText(file);
  });
}

export async function hasPermission(dirHandle): Promise<boolean> {
  const opts: any = {};
  opts.writable = true;
  // For Chrome 86 and later...
  opts.mode = 'readwrite';
  return (await dirHandle.queryPermission(opts)) === 'granted';
}

export type RecurseDirResult = [
  ...DirTypeSystemHandle[],
  FileTypeSystemHandle,
][];

/**
 *
 * Note this will always return a list of files and not empty directories
 * @param {Object} dirHandle The directory handle
 * @returns {Array<[dirHandles, fileHandle]>} returns a 2 dimensional array, with each element having [...parentDirHandless, fileHandle].
 *          The parent dir are in order of decreasing order of their distance from file, first parent being the ancestor of all others, and the last parent
 *           being the direct parent of file.
 */
export async function recurseDirHandle(
  rootDir: DirTypeSystemHandle,
  {
    allowedFile = (fileHandle: FileTypeSystemHandle): boolean => true,
    allowedDir = (dirHandle: DirTypeSystemHandle): boolean => true,
  } = {},
) {
  const _recurse = async (
    dirHandle: DirTypeSystemHandle,
  ): Promise<RecurseDirResult> => {
    let result: RecurseDirResult = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && allowedFile(entry)) {
        result.push([dirHandle, entry]);
      }
      if (entry.kind === 'directory' && allowedDir(entry)) {
        let children: RecurseDirResult = await recurseDirHandle(entry, {
          allowedDir,
          allowedFile,
        });
        // attach the parent first
        children = children.map((r) => [dirHandle, ...r]);
        result = result.concat(children);
      }
    }
    return result.filter((r) => r.length > 0);
  };

  return _recurse(rootDir);
}
