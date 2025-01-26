import type { AppRouteInfo } from '@bangle.io/types';
import type { EncodedRoute, RouteStrategy } from '@bangle.io/ws-path';
import {
  stripBasePath,
  toSearchString,
  parseBrowserSearch,
  payloadToSearch,
  handleRouteInfo,
} from './common';

export class QueryStringStrategy implements RouteStrategy {
  parseBrowserLocation(location: Location, basePath: string): EncodedRoute {
    return {
      pathname: stripBasePath(location.pathname, basePath),
      search: location.search,
    };
  }

  encodeRouteInfo(routeInfo: AppRouteInfo, basePath: string): EncodedRoute {
    const { route, payload } = routeInfo;
    const searchStr = toSearchString(payloadToSearch(route, payload));

    return {
      pathname: basePath || '/',
      search: searchStr ? `?${searchStr}` : '',
    };
  }

  decodeRouteInfo(encodedRoute: EncodedRoute, basePath: string): AppRouteInfo {
    const _pathname = stripBasePath(encodedRoute.pathname, basePath);
    const search = parseBrowserSearch(encodedRoute.search ?? '');
    return handleRouteInfo(search.route, search);
  }
}
