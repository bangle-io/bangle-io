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

const UNTITLED_NOTE_PREFIX = 'untitled-';

/**
 * The default name (without extension) for a new note: `untitled-N`, one past
 * the highest `untitled-N` among `noteNames`.
 */
export function getNextUntitledNoteName(noteNames: Iterable<string>): string {
  let highest = 0;
  for (const name of noteNames) {
    if (!name.startsWith(UNTITLED_NOTE_PREFIX)) {
      continue;
    }
    const num = Number.parseInt(name.slice(UNTITLED_NOTE_PREFIX.length), 10);
    if (!Number.isNaN(num)) {
      highest = Math.max(highest, num);
    }
  }
  return `${UNTITLED_NOTE_PREFIX}${highest + 1}`;
}
