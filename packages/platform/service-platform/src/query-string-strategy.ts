import type { AppRouteInfo } from '@bangle.io/types';
import { WsPath } from '@bangle.io/ws-path';
import type { EncodedRoute, RouteStrategy } from '@bangle.io/ws-path';

type SearchRecord = Record<string, string | null>;

function parseBrowserSearch(rawSearch: string): SearchRecord {
  const params = new URLSearchParams(rawSearch);
  const search: SearchRecord = {};
  for (const [key, value] of params) {
    search[key] = value;
  }
  return search;
}

function toSearchString(search: SearchRecord): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(search)) {
    if (v != null) {
      params.set(k, v);
    }
  }
  return params.toString();
}

function stripBasePath(pathname: string, basePath: string): string {
  if (basePath && pathname.startsWith(basePath)) {
    return pathname.slice(basePath.length) || '/';
  }
  return pathname;
}

export class QueryStringStrategy implements RouteStrategy {
  parseBrowserLocation(location: Location, basePath: string): EncodedRoute {
    return {
      pathname: stripBasePath(location.pathname, basePath),
      search: location.search,
    };
  }

  encodeRouteInfo(routeInfo: AppRouteInfo, basePath: string): EncodedRoute {
    const { route, payload } = routeInfo;
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

    const searchStr = toSearchString(search);

    return {
      pathname: basePath || '/',
      search: searchStr ? `?${searchStr}` : '',
    };
  }

  decodeRouteInfo(encodedRoute: EncodedRoute, basePath: string): AppRouteInfo {
    const pathname = stripBasePath(encodedRoute.pathname, basePath);
    const search = parseBrowserSearch(encodedRoute.search ?? '');
    const route = search.route;

    if (!route) {
      return { route: 'welcome', payload: {} };
    }

    switch (route) {
      case 'editor': {
        const wsPath = search.wsPath || '';
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
        const wsName = search.wsName || '';
        return {
          route: 'native-fs-auth-failed',
          payload: { wsName },
        };
      }

      case 'native-fs-auth-req': {
        const wsName = search.wsName || '';
        return {
          route: 'native-fs-auth-req',
          payload: { wsName },
        };
      }

      case 'workspace-not-found': {
        const wsName = search.wsName || '';
        return {
          route: 'workspace-not-found',
          payload: { wsName },
        };
      }

      case 'ws-path-not-found': {
        const wsPath = search.wsPath || '';
        return {
          route: 'ws-path-not-found',
          payload: { wsPath },
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
