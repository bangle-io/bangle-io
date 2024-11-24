// wouter uses this regexparam
import { parse as parsePattern } from 'regexparam';
import { matchRoute } from 'wouter';
import { resolvePath } from './helpers';

export function pathnameToWsPath(pathname?: string): {
  wsName: string | undefined;
  wsPath: string | undefined;
} {
  if (!pathname) {
    return { wsName: undefined, wsPath: undefined };
  }
  const [isMatched, match] = matchRoute(
    parsePattern,
    '/ws/:wsName/*?',
    pathname,
  );

  if (!isMatched) {
    return { wsName: undefined, wsPath: undefined };
  }

  const rawWsName = match?.wsName || undefined;

  if (typeof rawWsName !== 'string' || !rawWsName) {
    return { wsName: undefined, wsPath: undefined };
  }

  const rest = match?.['*'] || undefined;

  const wsName = decodeURIComponent(rawWsName);

  const result = rest
    ?.split('/')
    .map((r) => decodeURIComponent(r))
    .join('/');

  const wsPath = result ? `${wsName}:${result}` : undefined;

  return { wsName, wsPath };
}

export function wsPathToPathname(wsPath: string) {
  let { wsName, filePath } = resolvePath(wsPath);

  wsName = encodeURIComponent(wsName);
  filePath = filePath
    .split('/')
    .map((f) => encodeURIComponent(f))
    .join('/');

  return `/ws/${wsName}/${filePath}`;
}
