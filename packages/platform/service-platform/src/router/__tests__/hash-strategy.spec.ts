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
    it('preserves query parameters outside the hash route', () => {
      const strategyWithSearch = new HashStrategy(
        '?editorEngine=wordgard&debug=true',
      );

      expect(
        strategyWithSearch.encodeRouteInfo(
          { route: 'welcome', payload: {} },
          basePath,
        ),
      ).toEqual({
        pathname: '/app',
        search: '?editorEngine=wordgard&debug=true',
        hash: '#route=welcome',
      });
    });

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

    it('should encode settings general route', () => {
      const routeInfo: AppRouteInfo = {
        route: 'settings-general',
        payload: {},
      };

      const result = strategy.encodeRouteInfo(routeInfo, basePath);
      expect(result).toEqual({
        pathname: '/app',
        search: '',
        hash: '#route=settings-general',
      });
    });

    it('should encode settings general return target', () => {
      const routeInfo: AppRouteInfo = {
        route: 'settings-general',
        payload: {
          returnTo: '/ws#route=editor&wsPath=notes%3Aindex.md',
        },
      };

      expect(strategy.encodeRouteInfo(routeInfo, basePath)).toEqual({
        pathname: '/app',
        search: '',
        hash: '#route=settings-general&returnTo=%2Fws%23route%3Deditor%26wsPath%3Dnotes%253Aindex.md',
      });
    });

    it('should encode settings workspaces route', () => {
      const routeInfo: AppRouteInfo = {
        route: 'settings-workspaces',
        payload: {},
      };

      const result = strategy.encodeRouteInfo(routeInfo, basePath);
      expect(result).toEqual({
        pathname: '/app',
        search: '',
        hash: '#route=settings-workspaces',
      });
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

    it('should reject non-note file paths for editor routes', () => {
      const encoded: EncodedRoute = {
        pathname: '/app',
        search: '',
        hash: '#route=editor&wsPath=test:assets/report.pdf',
      };

      const result = strategy.decodeRouteInfo(encoded, basePath);
      expect(result.route).toBe('not-found');
      expect(result.payload).toEqual({ path: '/invalid-wsPath' });
    });

    it('should decode settings general route', () => {
      const encoded: EncodedRoute = {
        pathname: '/app',
        search: '',
        hash: '#route=settings-general',
      };

      expect(strategy.decodeRouteInfo(encoded, basePath)).toEqual({
        route: 'settings-general',
        payload: {},
      });
    });

    it('should decode settings general return target', () => {
      const encoded: EncodedRoute = {
        pathname: '/app',
        search: '',
        hash: '#route=settings-general&returnTo=%2Fws%23route%3Deditor%26wsPath%3Dnotes%253Aindex.md',
      };

      expect(strategy.decodeRouteInfo(encoded, basePath)).toEqual({
        route: 'settings-general',
        payload: {
          returnTo: '/ws#route=editor&wsPath=notes%3Aindex.md',
        },
      });
    });

    it('should decode settings workspaces route', () => {
      const encoded: EncodedRoute = {
        pathname: '/app',
        search: '',
        hash: '#route=settings-workspaces',
      };

      expect(strategy.decodeRouteInfo(encoded, basePath)).toEqual({
        route: 'settings-workspaces',
        payload: {},
      });
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
        name: 'settings general route with basePath',
        routeInfo: {
          route: 'settings-general',
          payload: {},
        },
        basePath: '/app',
      },
    ];

    testCases.forEach(({ name, routeInfo, basePath }) => {
      it(`should encode/decode for ${name}`, () => {
        const encoded = strategy.encodeRouteInfo(routeInfo, basePath);
        const decoded = strategy.decodeRouteInfo(encoded, basePath);
        expect(decoded).toEqual(routeInfo);
      });
    });
  });
});
