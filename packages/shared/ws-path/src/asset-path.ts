import { type WsFilePath, WsPath } from './ws-path';

const EXPLICIT_SCHEME_RE = /^[a-z][a-z\d+.-]*:/i;

function decodeSafeSegment(value: string): string | undefined {
  if (!value || value.includes('\\')) {
    return undefined;
  }

  try {
    const decoded = decodeURIComponent(value);
    return decoded &&
      !decoded.includes('/') &&
      !decoded.includes('\\') &&
      !decoded.includes('\0')
      ? decoded
      : undefined;
  } catch {
    return undefined;
  }
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

/**
 * Resolves a local Markdown asset target from a note without allowing workspace
 * escape or encoded path separators.
 */
export function resolveLocalMarkdownAsset(
  currentWsPath: string | WsFilePath,
  target: string,
): WsFilePath | undefined {
  const current = WsPath.safeParse(currentWsPath).data?.asFile();
  const input = target.trim();
  if (
    !current ||
    !input ||
    input.includes('\\') ||
    input.includes('?') ||
    input.includes('#') ||
    input.includes('//') ||
    EXPLICIT_SCHEME_RE.test(input)
  ) {
    return undefined;
  }

  const segments = input.startsWith('/')
    ? []
    : (current.getParent()?.path.split('/').filter(Boolean) ?? []);
  for (const encoded of input.replace(/^\//, '').split('/')) {
    if (!encoded || encoded === '.') {
      continue;
    }
    const segment = decodeSafeSegment(encoded);
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
      continue;
    }
    segments.push(segment);
  }

  return WsPath.safeFromParts(
    current.wsName,
    segments.join('/'),
  ).data?.asFile();
}

/** Creates a URL-style relative Markdown href from one note to a stored asset. */
export function relativeMarkdownAssetHref(
  sourceWsPath: string | WsFilePath,
  assetWsPath: string | WsFilePath,
): string | undefined {
  const source = WsPath.safeParse(sourceWsPath).data?.asFile();
  const asset = WsPath.safeParse(assetWsPath).data?.asFile();
  if (!source || !asset || source.wsName !== asset.wsName) {
    return undefined;
  }

  const sourceDir = source.getParent()?.path.split('/').filter(Boolean) ?? [];
  const assetParts = asset.path.split('/').filter(Boolean);
  const assetFileName = assetParts.at(-1);
  if (!assetFileName) {
    return undefined;
  }

  const assetDir = assetParts.slice(0, -1);
  let common = 0;
  while (
    common < sourceDir.length &&
    common < assetDir.length &&
    sourceDir[common] === assetDir[common]
  ) {
    common += 1;
  }

  const up = Array.from({ length: sourceDir.length - common }, () => '..');
  const down = assetDir.slice(common);
  const relative = [...up, ...down, assetFileName].map(encodeSegment);
  return relative.join('/') || encodeSegment(assetFileName);
}
