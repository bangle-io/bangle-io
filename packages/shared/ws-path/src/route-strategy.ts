import type { AppRouteInfo } from '@bangle.io/types';

/**
 * EncodedRoute represents the parts of the browser URL we care about
 */
export interface EncodedRoute {
  pathname: string;
  search?: string;
  hash?: string;
}

/**
 * A route strategy describes how to encode and decode between
 * the AppRouteInfo model and the actual location string(s).
 */
export interface RouteStrategy {
  /**
   * encodeRouteInfo: Takes the abstract route info object and
   * returns an EncodedRoute object.
   */
  encodeRouteInfo(routeInfo: AppRouteInfo, basePath: string): EncodedRoute;

  /**
   * decodeRouteInfo: Takes an EncodedRoute and transforms it back
   * into AppRouteInfo.
   */
  decodeRouteInfo(encodedRoute: EncodedRoute, basePath: string): AppRouteInfo;

  /**
   * Parse the real browser location (pathname, search, hash)
   * into an EncodedRoute.
   */
  parseBrowserLocation(location: Location, basePath: string): EncodedRoute;
}
