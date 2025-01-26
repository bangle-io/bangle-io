import type { AppRouteInfo } from '@bangle.io/types';
import type { EncodedRoute, RouteStrategy } from '@bangle.io/ws-path';
import { WsPath } from '@bangle.io/ws-path';

/**
 * A small helper to remove `basePath` from the start of `pathname`.
 */
function stripBasePath(pathname: string, basePath: string): string {
  if (!basePath) return pathname;
  const normalizedBase = basePath.endsWith('/')
    ? basePath.slice(0, -1)
    : basePath;
  if (pathname.startsWith(normalizedBase)) {
    return pathname.slice(normalizedBase.length) || '/';
  }
  return pathname;
}

/**
 * Convert a hash string (minus the leading '#') into a record of key-value pairs.
 * For example, if your location.hash is '#route=editor&wsPath=myWork:doc.md'
 * then `rawHash` is 'route=editor&wsPath=myWork:doc.md'.
 */
function parseHash(rawHash: string): Record<string, string | null> {
  const params = new URLSearchParams(rawHash.replace(/^#/, ''));
  const search: Record<string, string | null> = {};
  for (const [key, value] of params) {
    search[key] = value;
  }
  return search;
}

/**
 * Convert a record of key-value pairs into a hash string (minus the leading '#').
 */
function toHashString(search: Record<string, string | null>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(search)) {
    if (v != null) {
      params.set(k, v);
    }
  }
  return params.toString();
}

/**
 * A "HashStrategy" that keeps the `basePath` in the pathname,
 * but places all route/payload data into the URL's hash.
 *
 * For example, with basePath="/app", you might end up with:
 *   /app#route=editor&wsPath=myWorkspace:myNote.md
 *
 * This avoids putting sensitive information in the query string or path
 * and instead uses the fragment (hash) for better privacy in some contexts.
 */
export class HashStrategy implements RouteStrategy {
  parseBrowserLocation(location: Location, basePath: string): EncodedRoute {
    // We ignore location.search here, focusing on the hash.
    // The returned EncodedRoute keeps the 'pathname' so we can strip the base path,
    // but the rest of the route data lives in the 'hash'.
    return {
      pathname: stripBasePath(location.pathname, basePath),
      search: '',
      hash: location.hash || '',
    };
  }

  encodeRouteInfo(routeInfo: AppRouteInfo, basePath: string): EncodedRoute {
    const { route, payload } = routeInfo;
    // We'll store everything inside the hash as if it's a query string.
    const hashRecord: Record<string, string | null> = {
      route,
    };

    // Put each payload field in the hash as well
    for (const [key, val] of Object.entries(payload)) {
      if (val == null) continue;
      if (key === 'error' && val instanceof Error) {
        hashRecord[key] = val.message || 'Unknown error';
      } else {
        hashRecord[key] = String(val);
      }
    }

    const hashStr = toHashString(hashRecord);

    return {
      pathname: basePath || '/',
      search: '',
      hash: hashStr ? '#' + hashStr : '',
    };
  }

  decodeRouteInfo(encodedRoute: EncodedRoute, _basePath: string): AppRouteInfo {
    // We assume the route data is in `encodedRoute.hash`.
    const hashParams = parseHash(encodedRoute.hash?.replace(/^#/, '') || '');

    const route = hashParams.route;
    if (!route) {
      // If there's no `route` in the hash, fallback to a default
      return { route: 'welcome', payload: {} };
    }

    switch (route) {
      case 'editor': {
        const wsPath = hashParams.wsPath || '';
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
        const wsName = hashParams.wsName || '';
        const result = WsPath.validation.validateWsName(wsName);
        if (!result.ok) {
          return { route: 'not-found', payload: { path: '/invalid-wsName' } };
        }
        return {
          route: 'ws-home',
          payload: { wsName },
        };
      }
      case 'native-fs-auth-failed':
        return {
          route: 'native-fs-auth-failed',
          payload: { wsName: hashParams.wsName || '' },
        };
      case 'native-fs-auth-req':
        return {
          route: 'native-fs-auth-req',
          payload: { wsName: hashParams.wsName || '' },
        };
      case 'workspace-not-found':
        return {
          route: 'workspace-not-found',
          payload: { wsName: hashParams.wsName || '' },
        };
      case 'ws-path-not-found':
        return {
          route: 'ws-path-not-found',
          payload: { wsPath: hashParams.wsPath || '' },
        };
      case 'fatal-error':
        return {
          route: 'fatal-error',
          payload: { error: new Error(hashParams.error ?? 'Fatal error') },
        };
      case 'welcome':
        return { route: 'welcome', payload: {} };
      case 'not-found':
        return {
          route: 'not-found',
          payload: { path: hashParams.path ?? '' },
        };
      default:
        // If the 'route' is not recognized, treat it as a 404
        return { route: 'not-found', payload: { path: route } };
    }
  }
}
