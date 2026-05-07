import { WsPath } from '@bangle.io/ws-path';

const NOTE_EXTENSIONS = ['.md', '.markdown'] as const;
const EXTERNAL_LINK_SCHEME_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
const MARKDOWN_ESCAPE_REGEX = /\\([\\()[\]{}_*#+.!-])/g;

function normalizeRelativePath(baseDir: string, hrefPath: string): string {
  const baseSegments = baseDir.split('/').filter(Boolean);
  const targetSegments = hrefPath.split('/');
  const resolvedSegments = hrefPath.startsWith('/') ? [] : [...baseSegments];

  for (const segment of targetSegments) {
    if (!segment || segment === '.') {
      continue;
    }
    if (segment === '..') {
      resolvedSegments.pop();
      continue;
    }
    resolvedSegments.push(segment);
  }

  return resolvedSegments.join('/');
}

export function getResolvedNoteLinkWsPathCandidates(
  noteWsPath: string,
  href: string,
): string[] {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return [];
  }
  if (trimmed.startsWith('//') || EXTERNAL_LINK_SCHEME_REGEX.test(trimmed)) {
    return [];
  }

  const [rawPath] = trimmed.split(/[?#]/, 1);
  if (!rawPath) {
    return [];
  }

  let decodedPath = rawPath;
  try {
    decodedPath = decodeURI(rawPath);
  } catch {
    decodedPath = rawPath;
  }

  const normalizedTarget = decodedPath.replace(MARKDOWN_ESCAPE_REGEX, '$1');
  const notePath = WsPath.assertFile(noteWsPath);
  const parentDir = notePath.getParent()?.path || '';
  const resolvedPath = normalizeRelativePath(parentDir, normalizedTarget);

  if (!resolvedPath) {
    return [];
  }

  const lastSegment = resolvedPath.split('/').pop() || '';
  const hasExtension = lastSegment.includes('.') && !lastSegment.endsWith('.');
  if (hasExtension) {
    return [WsPath.fromParts(notePath.wsName, resolvedPath).wsPath];
  }

  return NOTE_EXTENSIONS.map(
    (extension) =>
      WsPath.fromParts(notePath.wsName, `${resolvedPath}${extension}`).wsPath,
  );
}
