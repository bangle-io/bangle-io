import type { AppRouteInfo } from '@bangle.io/types';
import type { EncodedRoute } from '@bangle.io/ws-path';
import { describe, expect, it } from 'vitest';
import { QueryStringStrategy } from '../query-string-strategy';

describe('QueryStringStrategy', () => {
  const strategy = new QueryStringStrategy();
  const basePath = '/app';

  describe('parseBrowserLocation', () => {
    it('should parse location with basePath', () => {
      const location = {
        pathname: '/app/some/path',
        search: '?route=editor&wsPath=test:file.md',
        hash: '',
      } as Location;

      const result = strategy.parseBrowserLocation(location, basePath);

      expect(result).toEqual({
        pathname: '/some/path',
        search: '?route=editor&wsPath=test:file.md',
      });
    });

    it('should handle root path', () => {
      const location = {
        pathname: '/app',
        search: '?route=welcome',
        hash: '',
      } as Location;

      const result = strategy.parseBrowserLocation(location, basePath);

      expect(result).toEqual({
        pathname: '/',
        search: '?route=welcome',
      });
    });
  });

  describe('encodeRouteInfo', () => {
    it('should encode editor route', () => {
      const routeInfo: AppRouteInfo = {
        route: 'editor',
        payload: { wsPath: 'test:file.md' },
      };

      const result = strategy.encodeRouteInfo(routeInfo, basePath);
      expect(result).toEqual({
        pathname: '/app',
        search: '?route=editor&wsPath=test%3Afile.md',
      });
    });

    it('should encode ws-home route', () => {
      const routeInfo: AppRouteInfo = {
        route: 'ws-home',
        payload: { wsName: 'test' },
      };

      const result = strategy.encodeRouteInfo(routeInfo, basePath);
      expect(result).toEqual({
        pathname: '/app',
        search: '?route=ws-home&wsName=test',
      });
    });

    it('should encode fatal error route', () => {
      const routeInfo: AppRouteInfo = {
        route: 'fatal-error',
        payload: { error: new Error('test error') },
      };

      const result = strategy.encodeRouteInfo(routeInfo, basePath);
      expect(result).toEqual({
        pathname: '/app',
        search: '?route=fatal-error&error=test+error',
      });
    });

    it('should handle empty basePath', () => {
      const routeInfo: AppRouteInfo = {
        route: 'welcome',
        payload: {},
      };

      const result = strategy.encodeRouteInfo(routeInfo, '');
      expect(result).toEqual({
        pathname: '/',
        search: '?route=welcome',
      });
    });
  });

  describe('decodeRouteInfo', () => {
    it('should decode editor route', () => {
      const encoded: EncodedRoute = {
        pathname: '/app',
        search: '?route=editor&wsPath=test:file.md',
      };

      const result = strategy.decodeRouteInfo(encoded, basePath);
      expect(result).toEqual({
        route: 'editor',
        payload: { wsPath: 'test:file.md' },
      });
    });

    it('should decode ws-home route', () => {
      const encoded: EncodedRoute = {
        pathname: '/app',
        search: '?route=ws-home&wsName=test',
      };

      const result = strategy.decodeRouteInfo(encoded, basePath);
      expect(result).toEqual({
        route: 'ws-home',
        payload: { wsName: 'test' },
      });
    });

    it('should decode fatal error route', () => {
      const encoded: EncodedRoute = {
        pathname: '/app',
        search: '?route=fatal-error&error=test+error',
      };

      const result = strategy.decodeRouteInfo(encoded, basePath);
      expect(result).toEqual({
        route: 'fatal-error',
        payload: { error: new Error('test error') },
      });
    });

    it('should return welcome route for missing route param', () => {
      const encoded: EncodedRoute = {
        pathname: '/app',
        search: '',
      };

      const result = strategy.decodeRouteInfo(encoded, basePath);
      expect(result).toEqual({
        route: 'welcome',
        payload: {},
      });
    });

    it('should handle invalid wsPath in editor route', () => {
      const encoded: EncodedRoute = {
        pathname: '/app',
        search: '?route=editor&wsPath=invalid',
      };

      const result = strategy.decodeRouteInfo(encoded, basePath);
      expect(result).toEqual({
        route: 'not-found',
        payload: { path: '/invalid-wsPath' },
      });
    });

    it('should handle invalid wsName in ws-home route', () => {
      const encoded: EncodedRoute = {
        pathname: '/app',
        search: '?route=ws-home&wsName=',
      };

      const result = strategy.decodeRouteInfo(encoded, basePath);
      expect(result).toEqual({
        route: 'not-found',
        payload: { path: '/invalid-wsName' },
      });
    });
  });
});
