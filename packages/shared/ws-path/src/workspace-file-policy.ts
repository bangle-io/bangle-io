import { type WsFilePath, WsPath } from './ws-path';

const IGNORED_DIRECTORY_NAMES = new Set([
  '__macosx',
  '__pycache__',
  'bower_components',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'out',
  'target',
  'temp',
  'tmp',
  'vendor',
]);

const IGNORED_FILE_NAMES = new Set(['desktop.ini', 'thumbs.db']);

/**
 * Chromium's File System Access API writes `<name>.crswap` swap files next
 * to real content while a writable stream is open. They can surface through
 * directory listings and file watchers mid-write and must never be treated
 * as workspace content.
 *
 * Deliberately narrow: broader temp suffixes like `.tmp`/`.swp` can be
 * legitimate pre-existing user files (and the asset pipeline accepts them),
 * so hiding them here would silently remove them from every listing.
 * Watcher-only noise suppression for such suffixes belongs in the watcher
 * (see `TRANSIENT_WATCH_SUFFIXES` in the native FS storage provider).
 */
const IGNORED_FILE_SUFFIXES = ['.crswap'];

function pathSegments(filePath: WsFilePath): readonly string[] {
  return filePath.path.split('/').filter(Boolean);
}

export function isIgnoredWorkspacePathSegment(segment: string): boolean {
  return (
    segment.startsWith('.') ||
    IGNORED_DIRECTORY_NAMES.has(segment.toLowerCase())
  );
}

export function isVisibleWorkspaceDirectoryName(name: string): boolean {
  return !isIgnoredWorkspacePathSegment(name);
}

export function isVisibleWorkspaceFilePath(
  wsPath: string | WsFilePath,
): wsPath is WsFilePath {
  const filePath = WsPath.safeParseFile(wsPath).data;
  if (!filePath) {
    return false;
  }

  const segments = pathSegments(filePath);
  const fileName = segments.at(-1);
  if (!fileName) {
    return false;
  }

  const parentSegments = segments.slice(0, -1);
  if (
    parentSegments.some((segment) => isIgnoredWorkspacePathSegment(segment))
  ) {
    return false;
  }

  const lowerFileName = fileName.toLowerCase();
  if (IGNORED_FILE_SUFFIXES.some((suffix) => lowerFileName.endsWith(suffix))) {
    return false;
  }

  if (filePath.isNote()) {
    return parentSegments.length === 0 || !fileName.startsWith('.');
  }

  if (
    fileName.startsWith('.') ||
    IGNORED_FILE_NAMES.has(fileName.toLowerCase())
  ) {
    return false;
  }

  return true;
}
