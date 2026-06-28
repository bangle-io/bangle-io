import { VALID_MARKDOWN_EXTENSIONS_SET } from './constants';
import { type WsFilePath, WsPath } from './ws-path';

function decodeSegment(value: string): string | undefined {
  try {
    const decoded = decodeURIComponent(value);
    return decoded && !decoded.includes('/') && !decoded.includes('\\')
      ? decoded
      : undefined;
  } catch {
    return undefined;
  }
}

function hasUnsafeEncoding(value: string): boolean {
  if (!value.includes('%')) {
    return false;
  }
  try {
    const decoded = decodeURIComponent(value);
    return decoded.includes('/') || decoded.includes('\\');
  } catch {
    return true;
  }
}

/** Resolves a URL-style path without allowing workspace escape or separators hidden by encoding. */
export function resolveInternalWsPath(
  currentWsPath: string | WsFilePath,
  target: string,
): WsFilePath | undefined {
  const current = WsPath.safeParse(currentWsPath).data?.asFile();
  if (!current || target.includes('//') || target.includes('?')) {
    return undefined;
  }

  const path = target.split('#', 1)[0] ?? '';
  if (!path) {
    return current;
  }

  const segments = path.startsWith('/')
    ? []
    : (current.getParent()?.path.split('/').filter(Boolean) ?? []);
  for (const encoded of path.replace(/^\//, '').split('/')) {
    if (!encoded || encoded === '.') {
      continue;
    }
    const segment = decodeSegment(encoded);
    if (!segment) {
      return undefined;
    }
    if (segment === '.') {
      continue;
    }
    if (segment === '..') {
      if (!segments.pop()) {
        return undefined;
      }
    } else {
      segments.push(segment);
    }
  }

  const result = WsPath.safeFromParts(current.wsName, segments.join('/')).data;
  const file = result?.asFile();
  return file?.extension &&
    VALID_MARKDOWN_EXTENSIONS_SET.has(file.extension.toLocaleLowerCase())
    ? file
    : undefined;
}

function withoutMarkdownExtension(path: string): string {
  return path.replace(/\.(?:md|markdown)$/i, '');
}

export type WikiLinkIndex = {
  wsName: string;
  notes: readonly WsFilePath[];
  searchRecords: readonly {
    wsPath: WsFilePath;
    searchText: string;
    target: string;
  }[];
  byWsPath: ReadonlyMap<string, WsFilePath>;
  byStem: ReadonlyMap<string, readonly WsFilePath[]>;
  byLowerStem: ReadonlyMap<string, readonly WsFilePath[]>;
};

function createWikiLinkTargetFromIndex(
  path: WsFilePath,
  index: Pick<WikiLinkIndex, 'byLowerStem'>,
): string {
  const stem = path.fileNameWithoutExtension;
  const matches = index.byLowerStem.get(stem.toLocaleLowerCase()) ?? [];
  return matches.length === 1
    ? stem
    : `/${withoutMarkdownExtension(path.filePath)}`;
}

function appendMapValue(
  map: Map<string, WsFilePath[]>,
  key: string,
  value: WsFilePath,
) {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
  } else {
    map.set(key, [value]);
  }
}

export function createWikiLinkIndex(
  wsPaths: readonly WsFilePath[],
  wsName: string,
): WikiLinkIndex {
  const notes = wsPaths.filter(
    (path) => path.wsName === wsName && path.isMarkdown(),
  );
  const byWsPath = new Map<string, WsFilePath>();
  const byStem = new Map<string, WsFilePath[]>();
  const byLowerStem = new Map<string, WsFilePath[]>();

  for (const note of notes) {
    byWsPath.set(note.wsPath, note);
    appendMapValue(byStem, note.fileNameWithoutExtension, note);
    appendMapValue(
      byLowerStem,
      note.fileNameWithoutExtension.toLocaleLowerCase(),
      note,
    );
  }

  const index = { byLowerStem };

  return {
    wsName,
    notes,
    searchRecords: notes.map((path) => ({
      wsPath: path,
      searchText: `${path.fileNameWithoutExtension} ${path.filePath}`,
      target: createWikiLinkTargetFromIndex(path, index),
    })),
    byWsPath,
    byStem,
    byLowerStem,
  };
}

function getIndex(
  current: WsFilePath,
  indexOrPaths: WikiLinkIndex | readonly WsFilePath[],
): WikiLinkIndex {
  return 'byWsPath' in indexOrPaths
    ? indexOrPaths
    : createWikiLinkIndex(indexOrPaths, current.wsName);
}

/** Resolves legacy and relative wiki targets against the known notes in one workspace. */
export function resolveWikiLinkTarget(
  currentWsPath: string | WsFilePath,
  target: string,
  indexOrPaths: WikiLinkIndex | readonly WsFilePath[],
): WsFilePath | undefined {
  const current = WsPath.safeParse(currentWsPath).data?.asFile();
  if (
    !current ||
    !target ||
    target.includes('\\') ||
    target.includes(':') ||
    hasUnsafeEncoding(target)
  ) {
    return undefined;
  }
  const index = getIndex(current, indexOrPaths);
  if (index.wsName !== current.wsName) {
    return undefined;
  }
  const explicitPath = /^(?:\/|\.\.?\/)/.test(target) || target.includes('/');

  if (explicitPath) {
    const rootRelative = target.startsWith('/') || !/^\.\.?\//.test(target);
    const base = rootRelative ? `/${target.replace(/^\//, '')}` : target;
    for (const extension of ['', '.md', '.markdown']) {
      const resolved = resolveInternalWsPath(current, `${base}${extension}`);
      if (resolved) {
        const match = index.byWsPath.get(resolved.wsPath);
        if (match) return match;
      }
    }
    return undefined;
  }

  const stem = withoutMarkdownExtension(target);
  const exact = index.byStem.get(stem) ?? [];
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return undefined;
  const insensitive = index.byLowerStem.get(stem.toLocaleLowerCase()) ?? [];
  return insensitive.length === 1 ? insensitive[0] : undefined;
}

/** Produces the shortest unambiguous target for a picker-created wiki link. */
export function createWikiLinkTarget(
  path: WsFilePath,
  indexOrPaths: WikiLinkIndex | readonly WsFilePath[],
): string {
  const index = getIndex(path, indexOrPaths);
  return createWikiLinkTargetFromIndex(path, index);
}
