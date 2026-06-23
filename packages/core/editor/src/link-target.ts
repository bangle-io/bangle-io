import { resolveInternalWsPath } from '@bangle.io/ws-path';

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

export function getInternalLinkHeading(href: string): string | undefined {
  const hashIndex = href.indexOf('#');
  if (hashIndex < 0 || hashIndex === href.length - 1) {
    return undefined;
  }

  try {
    const heading = decodeURIComponent(href.slice(hashIndex + 1));
    const hasControlCharacter = [...heading].some(
      (character) => character.charCodeAt(0) <= 0x1f,
    );
    return heading && !hasControlCharacter ? heading : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeLinkTarget(value: string): LinkTarget | undefined {
  const input = value.trim();
  if (!input) {
    return undefined;
  }

  const hasHttpScheme = /^https?:\/\//i.test(input);
  const looksLikeHostWithPort = /^[^/:\s]+:\d+(?:\/|$)/.test(input);
  const markdownPath = input.split(/[?#]/, 1)[0] ?? input;
  const hasRelativePathPrefix = /^(?:\.\.?\/|\/)/.test(markdownPath);
  const firstPathSegment = markdownPath.split('/')[0] ?? '';
  const looksLikeHostname = /^[^\s.][^/\s]*\.[a-z]{2,}$/i.test(
    firstPathSegment,
  );
  const looksLikeWebMarkdownPath =
    !hasRelativePathPrefix && markdownPath.includes('/') && looksLikeHostname;
  if (input.startsWith('#')) {
    return !input.includes('?') && getInternalLinkHeading(input)
      ? { kind: 'internal', href: input }
      : undefined;
  }
  if (
    !hasHttpScheme &&
    !hasExplicitScheme(input) &&
    hasMarkdownExtension(markdownPath) &&
    !looksLikeWebMarkdownPath
  ) {
    if (
      input.includes('?') ||
      (input.includes('#') && !getInternalLinkHeading(input))
    ) {
      return undefined;
    }
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
  return resolveInternalWsPath(currentWsPath, normalizedTarget.href)?.wsPath;
}
