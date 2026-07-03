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
    IGNORED_DIRECTORY_NAMES.has(segment.toLocaleLowerCase())
  );
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

  if (
    fileName.startsWith('.') ||
    IGNORED_FILE_NAMES.has(fileName.toLocaleLowerCase())
  ) {
    return false;
  }

  return segments
    .slice(0, -1)
    .every((segment) => !isIgnoredWorkspacePathSegment(segment));
}
