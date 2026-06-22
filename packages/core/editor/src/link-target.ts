import { WsPath } from '@bangle.io/ws-path';

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

export type LinkTarget =
  | { kind: 'external'; href: string }
  | { kind: 'internal'; href: string };

function hasExplicitScheme(value: string): boolean {
  return /^[a-z][a-z\d+.-]*:/i.test(value);
}

function hasMarkdownExtension(value: string): boolean {
  const lowerValue = value.toLowerCase();
  return lowerValue.endsWith('.md') || lowerValue.endsWith('.markdown');
}

export function normalizeLinkTarget(value: string): LinkTarget | undefined {
  const input = value.trim();
  if (!input || /[?#]/.test(input)) {
    return undefined;
  }

  const hasHttpScheme = /^https?:\/\//i.test(input);
  const looksLikeHostWithPort = /^[^/:\s]+:\d+(?:\/|$)/.test(input);
  if (
    !hasHttpScheme &&
    !hasExplicitScheme(input) &&
    hasMarkdownExtension(input)
  ) {
    return { kind: 'internal', href: input };
  }

  if (hasExplicitScheme(input) && !hasHttpScheme && !looksLikeHostWithPort) {
    return undefined;
  }

  try {
    const url = new URL(hasHttpScheme ? input : `https://${input}`);
    if (
      !HTTP_PROTOCOLS.has(url.protocol) ||
      !url.hostname ||
      /[%\s]/.test(url.hostname)
    ) {
      return undefined;
    }
    return { kind: 'external', href: url.href };
  } catch {
    return undefined;
  }
}

export function resolveInternalLink(
  currentWsPath: string,
  href: string,
): string | undefined {
  const normalizedTarget = normalizeLinkTarget(href);
  if (
    normalizedTarget?.kind !== 'internal' ||
    normalizedTarget.href.includes('//')
  ) {
    return undefined;
  }
  const targetHref = normalizedTarget.href;

  const currentFile = WsPath.safeParse(currentWsPath).data?.asFile();
  if (!currentFile) {
    return undefined;
  }

  const targetSegments = targetHref.startsWith('/')
    ? []
    : (currentFile.getParent()?.path.split('/').filter(Boolean) ?? []);

  for (const encodedSegment of targetHref.replace(/^\//, '').split('/')) {
    let segment: string;
    try {
      segment = decodeURIComponent(encodedSegment);
    } catch {
      return undefined;
    }

    if (segment.includes('/') || segment.includes('\\')) {
      return undefined;
    }
    if (!segment || segment === '.') {
      continue;
    }
    if (segment === '..') {
      if (!targetSegments.pop()) {
        return undefined;
      }
      continue;
    }
    targetSegments.push(segment);
  }

  const target = WsPath.safeFromParts(
    currentFile.wsName,
    targetSegments.join('/'),
  ).data;
  return target && hasMarkdownExtension(target.path)
    ? target.wsPath
    : undefined;
}
