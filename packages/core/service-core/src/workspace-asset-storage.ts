import {
  createAppError,
  getAppErrorCause,
  isAppError,
} from '@bangle.io/base-utils';
import type { AssetLocationPreference } from '@bangle.io/types';
import {
  relativeMarkdownAssetHref,
  WsDirPath,
  type WsFilePath,
  WsPath,
} from '@bangle.io/ws-path';

export type AssetStorageFileSystem = {
  createFile: (wsPath: string, file: File) => Promise<void>;
  getMaxFileSizeBytes: (wsPath: string) => Promise<number>;
};

export type StoredWorkspaceAsset = {
  file: File;
  wsPath: WsFilePath;
  href?: string;
  label: string;
  isImage: boolean;
};

export type StoredMarkdownAsset = StoredWorkspaceAsset & {
  href: string;
};

export type StoreWorkspaceAssetFilesInput = {
  sourceWsPath?: string | WsFilePath;
  targetDirectoryWsPath?: string | WsDirPath;
  files: readonly File[];
  preference: AssetLocationPreference;
  fileSystem: AssetStorageFileSystem;
  signal?: AbortSignal;
  onFileError?: (error: {
    file: File;
    cause: unknown;
    error: Error;
    sourceWsPath?: string | WsFilePath;
    targetDirectoryWsPath?: string | WsDirPath;
  }) => void;
};

export type AssetDestinationInput = {
  sourceWsPath?: string | WsFilePath;
  targetDirectoryWsPath?: string | WsDirPath;
  file: File;
  preference: AssetLocationPreference;
  now?: Date;
};

const MIME_EXTENSION_BY_TYPE = new Map<string, string>([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp'],
  ['image/svg+xml', '.svg'],
  ['image/avif', '.avif'],
  ['application/pdf', '.pdf'],
  ['text/plain', '.txt'],
  ['text/markdown', '.md'],
]);

const IMAGE_EXTENSIONS = new Set([
  '.avif',
  '.gif',
  '.jpg',
  '.jpeg',
  '.png',
  '.svg',
  '.webp',
]);

function pad(value: number, length = 2): string {
  return value.toString().padStart(length, '0');
}

function timestamp(date: Date): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    '-',
    pad(date.getMilliseconds(), 3),
  ].join('');
}

function splitFileName(name: string): { baseName: string; extension: string } {
  const trimmed = name.trim();
  const lastSegment = trimmed.split(/[\\/]/).at(-1) ?? '';
  const lastDot = lastSegment.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === lastSegment.length - 1) {
    return { baseName: lastSegment, extension: '' };
  }
  return {
    baseName: lastSegment.slice(0, lastDot),
    extension: lastSegment.slice(lastDot).toLowerCase(),
  };
}

function safeExtension(file: File): string {
  const { extension } = splitFileName(file.name ?? '');
  if (/^\.[a-z0-9][a-z0-9-]{0,15}$/.test(extension)) {
    return extension;
  }
  return MIME_EXTENSION_BY_TYPE.get((file.type ?? '').toLowerCase()) ?? '.bin';
}

function slugBasename(value: string, fallback: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return normalized || fallback;
}

function targetDirectory(
  source: WsFilePath,
  preference: AssetLocationPreference,
): WsDirPath {
  const parent =
    source.getParent() ?? WsDirPath.fromString(`${source.wsName}:`);
  if (preference === 'adjacent') {
    return parent;
  }
  return WsDirPath.fromString(
    `${source.wsName}:${WsPath.pathJoin(parent.path, 'assets')}/`,
  );
}

export function createAssetFileName({
  file,
  now = new Date(),
}: {
  file: File;
  now?: Date;
}): string {
  const { baseName } = splitFileName(file.name ?? '');
  const fallback = isImageFile(file) ? 'image' : 'asset';
  return `${slugBasename(baseName, fallback)}-${timestamp(now)}${safeExtension(file)}`;
}

export function getAssetDestination({
  sourceWsPath,
  targetDirectoryWsPath,
  file,
  preference,
  now = new Date(),
}: AssetDestinationInput): WsFilePath | undefined {
  const targetDirectoryPath = targetDirectoryWsPath
    ? WsPath.safeParse(targetDirectoryWsPath).data?.asDir()
    : undefined;
  const source = sourceWsPath
    ? WsPath.safeParse(sourceWsPath).data?.asFile()
    : undefined;
  const destinationDirectory =
    targetDirectoryPath ??
    (source ? targetDirectory(source, preference) : undefined);
  if (!destinationDirectory) {
    return undefined;
  }
  return destinationDirectory.createFilePath(
    createAssetFileName({ file, now }),
  );
}

export async function writeAssetFile({
  sourceWsPath,
  targetDirectoryWsPath,
  file,
  preference,
  fileSystem,
  signal,
}: {
  sourceWsPath?: string | WsFilePath;
  targetDirectoryWsPath?: string | WsDirPath;
  file: File;
  preference: AssetLocationPreference;
  fileSystem: AssetStorageFileSystem;
  signal?: AbortSignal;
}): Promise<{ wsPath: WsFilePath; href?: string } | undefined> {
  const baseDestination = getAssetDestination({
    sourceWsPath,
    targetDirectoryWsPath,
    file,
    preference,
  });
  const source = sourceWsPath
    ? WsPath.safeParse(sourceWsPath).data?.asFile()
    : undefined;
  if (!baseDestination) {
    return undefined;
  }
  if (signal?.aborted) {
    return undefined;
  }

  const maxFileSizeBytes = await fileSystem.getMaxFileSizeBytes(
    baseDestination.wsPath,
  );
  if (signal?.aborted) {
    return undefined;
  }
  if (file.size > maxFileSizeBytes) {
    throw createAppError(
      'error::file:size-too-large',
      'File is too large for this workspace storage provider',
      {
        fileName: displayNameForAsset(file),
        fileSizeBytes: file.size,
        maxFileSizeBytes,
        wsPath: baseDestination.wsPath,
      },
    );
  }

  for (let attempt = 1; attempt <= 100; attempt += 1) {
    if (signal?.aborted) {
      return undefined;
    }
    const destination =
      attempt === 1
        ? baseDestination
        : baseDestination.replaceFileName(
            `${baseDestination.fileNameWithoutExtension}-${attempt}${baseDestination.extension}`,
          );
    try {
      await fileSystem.createFile(destination.wsPath, file);
      const href = source
        ? relativeMarkdownAssetHref(source, destination)
        : undefined;
      return { wsPath: destination, href };
    } catch (cause) {
      if (isAppError(cause)) {
        const appError = getAppErrorCause(cause);
        if (appError?.name === 'error::file:already-existing') {
          continue;
        }
      }
      throw cause;
    }
  }

  throw createAppError(
    'error::file:already-existing',
    'Unable to create asset file',
    {
      wsPath: baseDestination.wsPath,
    },
  );
}

export async function storeWorkspaceAssetFiles({
  sourceWsPath,
  targetDirectoryWsPath,
  files,
  preference,
  fileSystem,
  signal,
  onFileError,
}: StoreWorkspaceAssetFilesInput): Promise<StoredWorkspaceAsset[]> {
  const stored: StoredWorkspaceAsset[] = [];

  for (const file of files) {
    if (signal?.aborted) {
      break;
    }
    try {
      const result = await writeAssetFile({
        sourceWsPath,
        targetDirectoryWsPath,
        file,
        preference,
        fileSystem,
        signal,
      });
      if (result) {
        stored.push({
          file,
          wsPath: result.wsPath,
          href: result.href,
          label: displayNameForAsset(file),
          isImage: isImageFile(file),
        });
      }
    } catch (cause) {
      if (signal?.aborted) {
        break;
      }
      onFileError?.({
        file,
        cause,
        error: cause instanceof Error ? cause : new Error(String(cause)),
        sourceWsPath,
        targetDirectoryWsPath,
      });
    }
  }

  return stored;
}

export function displayNameForAsset(file: File): string {
  const name = (file.name ?? '').trim().split(/[\\/]/).at(-1);
  return name || (isImageFile(file) ? 'image' : 'asset');
}

export function isImageFile(file: File): boolean {
  if ((file.type ?? '').startsWith('image/')) {
    return true;
  }
  const { extension } = splitFileName(file.name ?? '');
  return IMAGE_EXTENSIONS.has(extension);
}
