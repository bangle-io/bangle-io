import type { AppRouteInfo } from '@bangle.io/types';
import { WsPath } from '@bangle.io/ws-path';
import type { EncodedRoute, RouteStrategy } from '@bangle.io/ws-path';

type SearchRecord = Record<string, string | null>;

function toSearchString(search: SearchRecord): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(search)) {
    if (v != null) {
      params.set(k, v);
    }
  }
  return params.toString();
}

function parseBrowserSearch(rawSearch: string): SearchRecord {
  const params = new URLSearchParams(rawSearch);
  const search: SearchRecord = {};
  for (const [key, value] of params) {
    search[key] = value;
  }
  return search;
}

function stripBasePath(pathname: string, basePath: string): string {
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

function joinPaths(...parts: string[]): string {
  return `/${parts
    .map((p) => p.replace(/^\/|\/$/g, ''))
    .filter(Boolean)
    .join('/')}`.replace(/\/+/g, '/');
}

/**
 * A path-based routing strategy that uses URLs like:
 * /editor?wsPath=myWorkspace:myNote.md
 * /ws-home?wsName=myWorkspace
 */
export class PathBasedStrategy implements RouteStrategy {
  parseBrowserLocation(location: Location, basePath: string): EncodedRoute {
    return {
      pathname: stripBasePath(location.pathname, basePath),
      search: location.search,
      hash: location.hash,
    };
  }

  encodeRouteInfo(routeInfo: AppRouteInfo, basePath: string): EncodedRoute {
    const { route, payload } = routeInfo;
    const search: SearchRecord = {};

    // Move all payload parameters to search string
    for (const [key, val] of Object.entries(payload)) {
      if (val == null) {
        continue;
      }
      if (key === 'error' && val instanceof Error) {
        search[key] = val.message || 'Fatal error';
      } else {
        search[key] = String(val);
      }
    }

    const searchStr = toSearchString(search);
    const pathname = joinPaths(basePath || '', route);

    return {
      pathname,
      search: searchStr ? `?${searchStr}` : '',
      hash: '',
    };
  }

  decodeRouteInfo(encodedRoute: EncodedRoute, basePath: string): AppRouteInfo {
    const pathname = stripBasePath(encodedRoute.pathname, basePath);
    const pathSegments = pathname.split('/').filter(Boolean);
    const search = parseBrowserSearch(encodedRoute.search ?? '');

    // Path should be like ['route']
    if (pathSegments.length === 0) {
      return { route: 'welcome', payload: {} };
    }

    const route = pathSegments[0];

    switch (route) {
      case 'editor': {
        const wsPath = search.wsPath?.trim() || '';
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
        const wsName = search.wsName || '';
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
          payload: { wsName: search.wsName || '' },
        };
      }

      case 'native-fs-auth-req': {
        return {
          route: 'native-fs-auth-req',
          payload: { wsName: search.wsName || '' },
        };
      }

      case 'workspace-not-found': {
        return {
          route: 'workspace-not-found',
          payload: { wsName: search.wsName || '' },
        };
      }

      case 'ws-path-not-found': {
        return {
          route: 'ws-path-not-found',
          payload: { wsPath: search.wsPath || '' },
        };
      }

      case 'fatal-error': {
        return {
          route: 'fatal-error',
          payload: { error: new Error(search.error ?? 'Fatal error') },
        };
      }

      case 'welcome': {
        return { route: 'welcome', payload: {} };
      }

      case 'not-found': {
        return {
          route: 'not-found',
          payload: { path: search.path ?? '' },
        };
      }

      default:
        return { route: 'not-found', payload: { path: route } };
    }
  }
}
