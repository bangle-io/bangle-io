export interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

export async function createFile(
  rootDirHandle: FileSystemDirectoryHandle,
  path: string | string[],
) {
  if (typeof path === 'string') {
    path = path.split('/');
  }

  const recurse = async (
    path: string[],
    dirHandle: FileSystemDirectoryHandle,
  ): Promise<FileSystemFileHandle> => {
    const [parentName, ...rest] = path;

    if (!parentName) {
      throw new Error('parentName cannot be empty');
    }
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

export function readFileAsText(file: File | Blob): Promise<string> {
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
function _readFileLegacy(file: File | Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', (e) => {
      const text = (e.srcElement as any)?.result;
      resolve(text);
    });
    reader.readAsText(file);
  });
}

export async function hasPermission(
  dirHandle: FileSystemDirectoryHandle,
): Promise<boolean> {
  const opts: any = {};
  opts.writable = true;
  // For Chrome 86 and later...
  opts.mode = 'readwrite';

  // In Safari's origin private file system `queryPermission` is not available.
  if (!dirHandle.queryPermission) {
    console.debug('queryPermission not available, assuming permission');

    return true;
  }

  return (await dirHandle.queryPermission(opts)) === 'granted';
}

export type RecurseDirResult = Array<
  [...FileSystemDirectoryHandle[], FileSystemFileHandle]
>;

/**
 *
 * Note this will always return a list of files and not empty directories
 * @param {Object} dirHandle The directory handle
 * @returns {Array<[dirHandles, fileHandle]>} returns a 2 dimensional array, with each element having [...parentDirHandless, fileHandle].
 *          The parent dir are in order of decreasing order of their distance from file, first parent being the ancestor of all others, and the last parent
 *           being the direct parent of file.
 */
export async function recurseDirHandle(
  rootDir: FileSystemDirectoryHandle,
  {
    allowedFile = (fileHandle: FileSystemFileHandle): boolean => true,
    allowedDir = (dirHandle: FileSystemDirectoryHandle): boolean => true,
  } = {},
) {
  const _recurse = async (
    dirHandle: FileSystemDirectoryHandle,
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
