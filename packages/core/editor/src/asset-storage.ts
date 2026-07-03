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

type FileSystem = {
  createFile: (wsPath: string, file: File) => Promise<void>;
};

export type AssetDestinationInput = {
  currentWsPath: string | WsFilePath;
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
    extension: lastSegment.slice(lastDot).toLocaleLowerCase(),
  };
}

function safeExtension(file: File): string {
  const { extension } = splitFileName(file.name ?? '');
  if (/^\.[a-z0-9][a-z0-9-]{0,15}$/.test(extension)) {
    return extension;
  }
  return (
    MIME_EXTENSION_BY_TYPE.get((file.type ?? '').toLocaleLowerCase()) ?? '.bin'
  );
}

function slugBasename(value: string, fallback: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return normalized || fallback;
}

function targetDirectory(
  current: WsFilePath,
  preference: AssetLocationPreference,
): WsDirPath {
  const parent =
    current.getParent() ?? WsDirPath.fromString(`${current.wsName}:`);
  if (preference === 'adjacent') {
    return parent;
  }
  return WsDirPath.fromString(
    `${current.wsName}:${WsPath.pathJoin(parent.path, 'assets')}/`,
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
  currentWsPath,
  file,
  preference,
  now = new Date(),
}: AssetDestinationInput): WsFilePath | undefined {
  const current = WsPath.safeParse(currentWsPath).data?.asFile();
  if (!current) {
    return undefined;
  }
  return targetDirectory(current, preference).createFilePath(
    createAssetFileName({ file, now }),
  );
}

export async function writeAssetFile({
  currentWsPath,
  file,
  preference,
  fileSystem,
}: {
  currentWsPath: string;
  file: File;
  preference: AssetLocationPreference;
  fileSystem: FileSystem;
}): Promise<{ wsPath: WsFilePath; href: string } | undefined> {
  const baseDestination = getAssetDestination({
    currentWsPath,
    file,
    preference,
  });
  const current = WsPath.safeParse(currentWsPath).data?.asFile();
  if (!baseDestination || !current) {
    return undefined;
  }

  for (let attempt = 1; attempt <= 100; attempt += 1) {
    const destination =
      attempt === 1
        ? baseDestination
        : baseDestination.replaceFileName(
            `${baseDestination.fileNameWithoutExtension}-${attempt}${baseDestination.extension}`,
          );
    try {
      await fileSystem.createFile(destination.wsPath, file);
      const href = relativeMarkdownAssetHref(current, destination);
      return href ? { wsPath: destination, href } : undefined;
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
