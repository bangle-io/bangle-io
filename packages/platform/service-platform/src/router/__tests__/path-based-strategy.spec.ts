import type { AppRouteInfo } from '@bangle.io/types';
import type { EncodedRoute } from '@bangle.io/ws-path';
import { describe, expect, it } from 'vitest';
import { PathBasedStrategy } from '../path-based-strategy';

describe('PathBasedStrategy', () => {
  const strategy = new PathBasedStrategy();
  const basePath = '/app';

  describe('parseBrowserLocation', () => {
    it('should parse location with basePath', () => {
      const location = {
        pathname: '/app/editor',
        search: '?wsPath=test:file.md',
        hash: '',
      } as Location;

      const result = strategy.parseBrowserLocation(location, basePath);
      expect(result).toEqual({
        pathname: '/editor',
        search: '?wsPath=test:file.md',
        hash: '',
      });
    });

    it('should handle root path', () => {
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

    it('should handle multi-segment basePath', () => {
      const location = {
        pathname: '/ws/ws-home',
        search: '?wsName=test',
        hash: '',
      } as Location;
      const result = strategy.parseBrowserLocation(location, '/ws');
      expect(result).toEqual({
        pathname: '/ws-home',
        search: '?wsName=test',
        hash: '',
      });
    });

    it('should handle basePath edge cases', () => {
      const location = {
        pathname: '/ws/',
        search: '?wsName=test',
        hash: '',
      } as Location;
      const result = strategy.parseBrowserLocation(location, '/ws');
      expect(result).toEqual({
        pathname: '/',
        search: '?wsName=test',
        hash: '',
      });
    });

    it('should parse location with hash', () => {
      const location = {
        pathname: '/app/editor',
        search: '?wsPath=test:file.md',
        hash: '#someAnchor',
      } as Location;
      const result = strategy.parseBrowserLocation(location, basePath);
      expect(result).toEqual({
        pathname: '/editor',
        search: '?wsPath=test:file.md',
        hash: '#someAnchor',
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
        pathname: '/app/editor',
        search: '?wsPath=test%3Afile.md',
        hash: '',
      });
    });

    it('should handle basePath with trailing slash', () => {
      const routeInfo: AppRouteInfo = {
        route: 'editor',
        payload: { wsPath: 'test:file.md' },
      };

      const result = strategy.encodeRouteInfo(routeInfo, '/app/');
      expect(result).toEqual({
        pathname: '/app/editor',
        search: '?wsPath=test%3Afile.md',
        hash: '',
      });
    });

    it('should handle route with leading slash', () => {
      const routeInfo: AppRouteInfo = {
        route: 'editor',
        payload: { wsPath: 'test:file.md' },
      };

      const result = strategy.encodeRouteInfo(routeInfo, '/app');
      expect(result).toEqual({
        pathname: '/app/editor',
        search: '?wsPath=test%3Afile.md',
        hash: '',
      });
    });

    it('should encode ws-home route', () => {
      const routeInfo: AppRouteInfo = {
        route: 'ws-home',
        payload: { wsName: 'test' },
      };

      const result = strategy.encodeRouteInfo(routeInfo, basePath);
      expect(result).toEqual({
        pathname: '/app/ws-home',
        search: '?wsName=test',
        hash: '',
      });
    });

    it('should encode fatal error route', () => {
      const routeInfo: AppRouteInfo = {
        route: 'fatal-error',
        payload: { error: new Error('test error') },
      };

      const result = strategy.encodeRouteInfo(routeInfo, basePath);
      expect(result).toEqual({
        pathname: '/app/fatal-error',
        search: '?error=test+error',
        hash: '',
      });
    });

    it('should handle empty basePath', () => {
      const routeInfo: AppRouteInfo = {
        route: 'editor',
        payload: { wsPath: 'test:file.md' },
      };

      const result = strategy.encodeRouteInfo(routeInfo, '');
      expect(result).toEqual({
        pathname: '/editor',
        search: '?wsPath=test%3Afile.md',
        hash: '',
      });
    });
  });

  describe('decodeRouteInfo', () => {
    it('should decode editor route', () => {
      const encoded: EncodedRoute = {
        pathname: '/editor',
        search: '?wsPath=test:file.md',
      };

      const result = strategy.decodeRouteInfo(encoded, basePath);
      expect(result).toEqual({
        route: 'editor',
        payload: { wsPath: 'test:file.md' },
      });
    });

    it('should decode ws-home route', () => {
      const encoded: EncodedRoute = {
        pathname: '/ws-home',
        search: '?wsName=test',
      };

      const result = strategy.decodeRouteInfo(encoded, basePath);
      expect(result).toEqual({
        route: 'ws-home',
        payload: { wsName: 'test' },
      });
    });

    it('should decode fatal error route', () => {
      const encoded: EncodedRoute = {
        pathname: '/fatal-error',
        search: '?error=test+error',
      };

      const result = strategy.decodeRouteInfo(encoded, basePath);
      expect(result).toEqual({
        route: 'fatal-error',
        payload: { error: new Error('test error') },
      });
    });

    it('should return welcome route for invalid path format', () => {
      const encoded: EncodedRoute = {
        pathname: '/invalid',
        search: '',
      };

      const result = strategy.decodeRouteInfo(encoded, basePath);
      expect(result).toEqual({
        route: 'not-found',
        payload: { path: 'invalid' },
      });
    });

    it('should handle invalid wsPath in editor route', () => {
      const encoded: EncodedRoute = {
        pathname: '/editor',
        search: '?wsPath=invalid',
      };

      const result = strategy.decodeRouteInfo(encoded, basePath);
      expect(result).toEqual({
        route: 'not-found',
        payload: { path: '/invalid-wsPath' },
      });
    });

    it('should handle invalid wsName in ws-home route', () => {
      const encoded: EncodedRoute = {
        pathname: '/ws-home',
        search: '?wsName=',
      };

      const result = strategy.decodeRouteInfo(encoded, basePath);
      expect(result).toEqual({
        route: 'not-found',
        payload: { path: '/invalid-wsName' },
      });
    });

    it('should decode ws-home with complex basePath', () => {
      const encoded: EncodedRoute = {
        pathname: '/ws-home',
        search: '?wsName=test',
      };
      const result = strategy.decodeRouteInfo(encoded, '/ws');
      expect(result).toEqual({
        route: 'ws-home',
        payload: { wsName: 'test' },
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
        name: 'ws-home route with basePath',
        routeInfo: {
          route: 'ws-home',
          payload: { wsName: 'test' },
        },
        basePath: '/ws',
      },
      {
        name: 'editor route without basePath',
        routeInfo: {
          route: 'editor',
          payload: { wsPath: 'test:file.md' },
        },
        basePath: '',
      },
    ];

    testCases.forEach(({ name, routeInfo, basePath }) => {
      it(`should correctly convert ${name} back and forth`, () => {
        const encoded = strategy.encodeRouteInfo(routeInfo, basePath);
        const decoded = strategy.decodeRouteInfo(encoded, basePath);
        expect(decoded).toEqual(routeInfo);
      });
    });
  });
});
