import type { AppRouteInfo } from '@bangle.io/types';
import type { EncodedRoute } from '@bangle.io/ws-path';
import { describe, expect, it } from 'vitest';
import { HashStrategy } from '../hash-strategy';

describe('HashStrategy', () => {
  const strategy = new HashStrategy();
  const basePath = '/app';

  describe('parseBrowserLocation', () => {
    it('should parse a location with basePath and hash', () => {
      const location = {
        pathname: '/app',
        search: '',
        hash: '#route=editor&wsPath=test:file.md',
      } as Location;

      const result = strategy.parseBrowserLocation(location, basePath);
      expect(result).toEqual({
        pathname: '/',
        search: '',
        hash: '#route=editor&wsPath=test:file.md',
      });
    });

    it('should parse location with no hash at all', () => {
      const location = {
        pathname: '/app/welcome',
        search: '',
        hash: '',
      } as Location;

      const result = strategy.parseBrowserLocation(location, basePath);
      expect(result).toEqual({
        pathname: '/welcome',
        search: '',
        hash: '',
      });
    });
  });

  describe('encodeRouteInfo', () => {
    it('should encode editor route info into hash', () => {
      const routeInfo: AppRouteInfo = {
        route: 'editor',
        payload: { wsPath: 'test:myNote.md' },
      };

      const result = strategy.encodeRouteInfo(routeInfo, basePath);
      expect(result).toEqual({
        pathname: '/app',
        search: '',
        hash: '#route=editor&wsPath=test%3AmyNote.md',
      });
    });

    it('should handle fatal-error with Error object properly', () => {
      const routeInfo: AppRouteInfo = {
        route: 'fatal-error',
        payload: { error: new Error('Something bad') },
      };

      const result = strategy.encodeRouteInfo(routeInfo, '/app/');
      // basePath is used as-is in encodeRouteInfo
      expect(result.pathname).toBe('/app/');
      expect(result.search).toBe('');
      expect(result.hash).toContain('fatal-error');
      expect(result.hash).toContain('error=Something+bad');
    });

    it('should handle empty payload fields', () => {
      const routeInfo: AppRouteInfo = {
        route: 'editor',
        payload: { wsPath: '' },
      };

      const result = strategy.encodeRouteInfo(routeInfo, '');
      expect(result.pathname).toBe('/');
      expect(result.search).toBe('');
      expect(result.hash).toMatch(/#route=editor(&wsPath=)?/);
    });
  });

  describe('decodeRouteInfo', () => {
    it('should decode a valid editor route from the hash', () => {
      const encoded: EncodedRoute = {
        pathname: '/editor',
        search: '',
        hash: '#route=editor&wsPath=test:file.md',
      };

      const result = strategy.decodeRouteInfo(encoded, basePath);
      expect(result).toEqual({
        route: 'editor',
        payload: { wsPath: 'test:file.md' },
      });
    });

    it('should return "welcome" if route is missing in the hash', () => {
      const encoded: EncodedRoute = {
        pathname: '/app',
        search: '',
        hash: '',
      };
      const result = strategy.decodeRouteInfo(encoded, basePath);
      expect(result).toEqual({
        route: 'welcome',
        payload: {},
      });
    });

    it('should handle invalid wsPath for editor route as not-found', () => {
      const encoded: EncodedRoute = {
        pathname: '/app',
        search: '',
        hash: '#route=editor&wsPath=not+valid??', // intentionally bad
      };

      const result = strategy.decodeRouteInfo(encoded, basePath);
      expect(result.route).toBe('not-found');
      expect(result.payload).toEqual({ path: '/invalid-wsPath' });
    });

    it('should decode a fatal-error route', () => {
      const encoded: EncodedRoute = {
        pathname: '/app',
        search: '',
        hash: '#route=fatal-error&error=OMG',
      };

      const result = strategy.decodeRouteInfo(encoded, basePath);
      expect(result.route).toBe('fatal-error');
      expect((result.payload as { error: Error }).error.message).toBe('OMG');
    });
  });

  describe('bidirectional conversion', () => {
    const testCases: Array<{
      name: string;
      routeInfo: AppRouteInfo;
      basePath: string;
    }> = [
      {
        name: 'editor route with basePath',
        routeInfo: {
          route: 'editor',
          payload: { wsPath: 'test:file.md' },
        },
        basePath: '/app',
      },
      {
        name: 'ws-home route no basePath',
        routeInfo: {
          route: 'ws-home',
          payload: { wsName: 'myWorkspace' },
        },
        basePath: '',
      },
      {
        name: 'fatal-error route with basePath',
        routeInfo: {
          route: 'fatal-error',
          payload: { error: new Error('Test error') },
        },
        basePath: '/someBase',
      },
    ];

    testCases.forEach(({ name, routeInfo, basePath }) => {
      it(`should encode/decode for ${name}`, () => {
        const encoded = strategy.encodeRouteInfo(routeInfo, basePath);
        const decoded = strategy.decodeRouteInfo(encoded, basePath);
        // Because we store only the error message for 'fatal-error', test carefully
        if (routeInfo.route === 'fatal-error') {
          expect(decoded.route).toBe('fatal-error');
          expect((decoded.payload as { error: Error }).error.message).toBe(
            (routeInfo.payload as { error: Error }).error.message,
          );
        } else {
          expect(decoded).toEqual(routeInfo);
        }
      });
    });
  });
});
