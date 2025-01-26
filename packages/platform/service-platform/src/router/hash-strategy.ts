import type { AppRouteInfo } from '@bangle.io/types';
import type { EncodedRoute, RouteStrategy } from '@bangle.io/ws-path';
import {
  handleRouteInfo,
  parseBrowserSearch,
  payloadToSearch,
  stripBasePath,
  toSearchString,
} from './common';

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
    const hashStr = toSearchString(payloadToSearch(route, payload));

    return {
      pathname: basePath || '/',
      search: '',
      hash: hashStr ? `#${hashStr}` : '',
    };
  }

  decodeRouteInfo(encodedRoute: EncodedRoute, _basePath: string): AppRouteInfo {
    // We assume the route data is in `encodedRoute.hash`.
    const hashParams = parseBrowserSearch(
      encodedRoute.hash?.replace(/^#/, '') || '',
    );
    return handleRouteInfo(hashParams.route, hashParams);
  }
}
