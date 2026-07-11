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
 * Transient files other software writes next to real content: Chromium's
 * File System Access swap files and common editor temp suffixes. They can
 * surface through directory listings and file watchers mid-write and must
 * never be treated as workspace content.
 */
const IGNORED_FILE_SUFFIXES = ['.crswap', '.tmp', '.swp'];

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
