import type { AppRouteInfo } from '@bangle.io/types';
import { WsPath } from '@bangle.io/ws-path';

export type SearchRecord = Record<string, string | null>;

/**
 * Convert search parameters to a URL search string
 */
export function toSearchString(search: SearchRecord): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(search)) {
    if (v != null) {
      params.set(k, v);
    }
  }
  return params.toString();
}

/**
 * Parse URL search string into a record
 */
export function parseBrowserSearch(rawSearch: string): SearchRecord {
  const params = new URLSearchParams(rawSearch);
  const search: SearchRecord = {};
  for (const [key, value] of params) {
    search[key] = value;
  }
  return search;
}

/**
 * Strip base path from pathname
 */
export function stripBasePath(pathname: string, basePath: string): string {
  if (!basePath) return pathname;

  // Ensure basePath starts with / and has no trailing slash
  let normalizedBase = basePath.startsWith('/') ? basePath : `/${basePath}`;
  normalizedBase = normalizedBase.endsWith('/')
    ? normalizedBase.slice(0, -1)
    : normalizedBase;

  // Normalize path to remove trailing slash
  const normalizedPath = pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;

  if (normalizedPath === normalizedBase) return '/';
  if (normalizedPath.startsWith(`${normalizedBase}/`))
    return normalizedPath.slice(normalizedBase.length);

  return normalizedPath;
}

/**
 * Join multiple path segments
 */
export function joinPaths(...parts: string[]): string {
  return `/${parts
    .map((p) => p.replace(/^\/|\/$/g, ''))
    .filter(Boolean)
    .join('/')}`.replace(/\/+/g, '/');
}

/**
 * Common route handling logic shared between strategies
 */
export function handleRouteInfo(
  route: string | undefined | null,
  params: SearchRecord,
): AppRouteInfo {
  if (!route) {
    return { route: 'welcome', payload: {} };
  }

  switch (route) {
    case 'editor': {
      const wsPath = params.wsPath?.trim() || '';
      const check = WsPath.safeParse(wsPath);
      if (!check.ok) {
        return { route: 'not-found', payload: { path: '/invalid-wsPath' } };
      }
      return {
        route: 'editor',
        payload: { wsPath },
      };
    }

    case 'ws-home': {
      const wsName = params.wsName || '';
      const result = WsPath.validation.validateWsName(wsName);
      if (!result.ok) {
        return { route: 'not-found', payload: { path: '/invalid-wsName' } };
      }
      return {
        route: 'ws-home',
        payload: { wsName },
      };
    }

    case 'native-fs-auth-failed': {
      return {
        route: 'native-fs-auth-failed',
        payload: { wsName: params.wsName || '' },
      };
    }

    case 'native-fs-auth-req': {
      return {
        route: 'native-fs-auth-req',
        payload: { wsName: params.wsName || '' },
      };
    }

    case 'workspace-not-found': {
      return {
        route: 'workspace-not-found',
        payload: { wsName: params.wsName || '' },
      };
    }

    case 'ws-path-not-found': {
      return {
        route: 'ws-path-not-found',
        payload: { wsPath: params.wsPath || '' },
      };
    }

    case 'fatal-error': {
      return {
        route: 'fatal-error',
        payload: { error: new Error(params.error ?? 'Unknown error') },
      };
    }

    case 'welcome': {
      return { route: 'welcome', payload: {} };
    }

    case 'not-found': {
      return {
        route: 'not-found',
        payload: { path: params.path ?? '' },
      };
    }

    default:
      return { route: 'not-found', payload: { path: route } };
  }
}

/**
 * Convert payload to search parameters
 */
export function payloadToSearch(
  route: string,
  payload: Record<string, any>,
): SearchRecord {
  const search: SearchRecord = { route };

  for (const [key, val] of Object.entries(payload)) {
    if (val == null) {
      continue;
    }
    if (key === 'error' && val instanceof Error) {
      search[key] = val.message || 'Unknown error';
    } else {
      search[key] = String(val);
    }
  }

  return search;
}
