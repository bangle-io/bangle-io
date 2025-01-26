import type { AppRouteInfo } from '@bangle.io/types';
import type { EncodedRoute, RouteStrategy } from '@bangle.io/ws-path';
import {
  handleRouteInfo,
  joinPaths,
  parseBrowserSearch,
  stripBasePath,
  toSearchString,
} from './common';

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
    // Convert payload to search params without including route
    const search: Record<string, string | null> = {};
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

    return handleRouteInfo(pathSegments[0], search);
  }
}
