// locationUtilities.test.ts

import { describe, expect, it } from 'vitest';
import { buildUrlPath, parseUrlPath } from '../routing';

describe('buildUrlPath', () => {
  describe('pageFatalError', () => {
    it('should return the correct pathname', () => {
      const result = buildUrlPath.pageFatalError();
      expect(result).toEqual({ pathname: '/ws-error/fatal-error' });
    });
  });

  describe('pageWsHome', () => {
    it('should return the correct pathname with wsName', () => {
      const wsName = 'myWorkspace';
      const result = buildUrlPath.pageWsHome({ wsName });
      expect(result).toEqual({ pathname: `/ws/${wsName}` });
    });

    it('should handle special characters in wsName', () => {
      const wsName = 'my Work space!';
      const result = buildUrlPath.pageWsHome({ wsName });
      expect(result).toEqual({ pathname: `/ws/${wsName}` });
    });

    it('should handle empty wsName', () => {
      const wsName = '';
      const result = buildUrlPath.pageWsHome({ wsName });
      expect(result).toEqual({ pathname: '/ws/' });
    });
  });

  describe('pageEditor', () => {
    it('should throw when wsPath does not contain ":"', () => {
      const wsPath = 'myWorkspace';
      expect(() =>
        buildUrlPath.pageEditor({ wsPath }),
      ).toThrowErrorMatchingInlineSnapshot('[BaseError: Invalid file wsPath]');
    });

    it('should return the correct pathname and search when wsPath contains ":"', () => {
      const wsPath = 'myWorkspace:file/path.md';
      const result = buildUrlPath.pageEditor({ wsPath });
      expect(result).toEqual({
        pathname: '/ws/myWorkspace/editor',
        search: { p: 'file/path.md' },
      });
    });

    it('should handle special characters in wsName and filePath', () => {
      const wsPath = 'my Workspace:file path with spaces.md';
      const result = buildUrlPath.pageEditor({ wsPath });
      expect(result).toEqual({
        pathname: '/ws/my Workspace/editor',
        search: { p: 'file path with spaces.md' },
      });
    });

    it('should handle multiple colons in wsPath', () => {
      const wsPath = 'myWorkspace:folder:subfolder:file.md';
      const result = buildUrlPath.pageEditor({ wsPath });
      expect(result).toEqual({
        pathname: '/ws/myWorkspace/editor',
        search: { p: 'folder:subfolder:file.md' },
      });
    });

    it('should handle empty filePath when wsPath contains ":"', () => {
      const wsPath = 'myWorkspace:';
      expect(() =>
        buildUrlPath.pageEditor({ wsPath }),
      ).toThrowErrorMatchingInlineSnapshot('[BaseError: Invalid file wsPath]');
    });

    it('should handle empty wsName when wsPath contains ":"', () => {
      const wsPath = ':file.md';
      expect(() =>
        buildUrlPath.pageEditor({ wsPath }),
      ).toThrowErrorMatchingInlineSnapshot('[BaseError: Invalid file wsPath]');
    });

    it('should throw an error when wsPath is undefined', () => {
      expect(() =>
        buildUrlPath.pageEditor({
          // @ts-expect-error - intentionally passing undefined
          wsPath: undefined,
        }),
      ).toThrow();
    });
  });

  describe('pageNativeFsAuthFailed', () => {
    it('should return the correct pathname with wsName', () => {
      const wsName = 'myWorkspace';
      const result = buildUrlPath.pageNativeFsAuthFailed({ wsName });
      expect(result).toEqual({
        pathname: `/ws-auth/failed/native-fs/${wsName}`,
      });
    });

    it('should handle special characters in wsName', () => {
      const wsName = 'my Workspace';
      const result = buildUrlPath.pageNativeFsAuthFailed({ wsName });
      expect(result).toEqual({
        pathname: `/ws-auth/failed/native-fs/${wsName}`,
      });
    });

    it('should handle empty wsName', () => {
      const wsName = '';
      const result = buildUrlPath.pageNativeFsAuthFailed({ wsName });
      expect(result).toEqual({ pathname: '/ws-auth/failed/native-fs/' });
    });
  });

  describe('pageNativeFsAuthReq', () => {
    it('should return the correct pathname with wsName', () => {
      const wsName = 'myWorkspace';
      const result = buildUrlPath.pageNativeFsAuthReq({ wsName });
      expect(result).toEqual({ pathname: `/ws-auth/req/native-fs/${wsName}` });
    });

    it('should handle special characters in wsName', () => {
      const wsName = 'my Workspace';
      const result = buildUrlPath.pageNativeFsAuthReq({ wsName });
      expect(result).toEqual({ pathname: `/ws-auth/req/native-fs/${wsName}` });
    });

    it('should handle empty wsName', () => {
      const wsName = '';
      const result = buildUrlPath.pageNativeFsAuthReq({ wsName });
      expect(result).toEqual({ pathname: '/ws-auth/req/native-fs/' });
    });
  });

  describe('pageNotFound', () => {
    it('should return the correct pathname', () => {
      const result = buildUrlPath.pageNotFound({ path: '/some-path' });
      expect(result).toEqual({
        pathname: '/ws-error/404',
        search: { p: '/some-path' },
      });
    });
  });

  describe('pageWorkspaceNotFound', () => {
    it('should return the correct pathname with wsName', () => {
      const wsName = 'myWorkspace';
      const result = buildUrlPath.pageWorkspaceNotFound({ wsName });
      expect(result).toEqual({ pathname: `/ws-error/no-ws/${wsName}` });
    });

    it('should handle special characters in wsName', () => {
      const wsName = 'my Workspace';
      const result = buildUrlPath.pageWorkspaceNotFound({ wsName });
      expect(result).toEqual({ pathname: `/ws-error/no-ws/${wsName}` });
    });

    it('should handle empty wsName', () => {
      const wsName = '';
      const result = buildUrlPath.pageWorkspaceNotFound({ wsName });
      expect(result).toEqual({ pathname: '/ws-error/no-ws/' });
    });
  });

  describe('pageWsPathNotFound', () => {
    it('should return the correct pathname with wsPath', () => {
      const wsPath = 'myWorkspace:file.md';
      const result = buildUrlPath.pageWsPathNotFound({ wsPath });
      expect(result).toEqual({ pathname: `/ws-error/no-path/${wsPath}` });
    });

    it('should handle special characters in wsPath', () => {
      const wsPath = 'my Workspace:file path with spaces.md';
      const result = buildUrlPath.pageWsPathNotFound({ wsPath });
      expect(result).toEqual({ pathname: `/ws-error/no-path/${wsPath}` });
    });

    it('should handle empty wsPath', () => {
      const wsPath = '';
      const result = buildUrlPath.pageWsPathNotFound({ wsPath });
      expect(result).toEqual({ pathname: '/ws-error/no-path/' });
    });
  });

  describe('pageWelcome', () => {
    it('should return the correct pathname', () => {
      const result = buildUrlPath.pageWelcome();
      expect(result).toEqual({ pathname: '/' });
    });
  });
});

describe('parseUrlPath', () => {
  describe('pageEditor', () => {
    it('should parse pathname and search into wsPath when search.p is present', () => {
      const pathname = '/ws/myWorkspace/editor';
      const search = { p: 'file/path.md' };
      const result = parseUrlPath.pageEditor({ pathname, search });
      expect(result).toEqual({ wsPath: 'myWorkspace:file/path.md' });
    });

    it('should return null when search.p is missing', () => {
      const pathname = '/ws/myWorkspace/editor';
      const result = parseUrlPath.pageEditor({ pathname });
      expect(result).toBeNull();
    });

    it('should handle special characters in wsName and filePath', () => {
      const pathname = '/ws/my Workspace/editor';
      const search = { p: 'file path with spaces.md' };
      const result = parseUrlPath.pageEditor({ pathname, search });
      expect(result).toEqual({
        wsPath: 'my Workspace:file path with spaces.md',
      });
    });

    it('should return null when pathname does not match', () => {
      const pathname = '/invalid/path';
      const result = parseUrlPath.pageEditor({ pathname });
      expect(result).toBeNull();
    });

    it('should handle empty wsName', () => {
      const pathname = '/ws//editor';
      const search = { p: 'file.md' };
      const result = parseUrlPath.pageEditor({ pathname, search });
      expect(result).toEqual(null);
    });

    it('should return null when wsName and search.p are missing', () => {
      const pathname = '/ws//editor';
      const result = parseUrlPath.pageEditor({ pathname });
      expect(result).toBeNull();
    });
  });

  describe('pageWsHome', () => {
    it('should parse pathname into wsName', () => {
      const pathname = '/ws/myWorkspace';
      const result = parseUrlPath.pageWsHome({ pathname });
      expect(result).toEqual({ wsName: 'myWorkspace' });
    });

    it('should handle special characters in wsName', () => {
      const pathname = '/ws/my Workspace';
      const result = parseUrlPath.pageWsHome({ pathname });
      expect(result).toEqual({ wsName: 'my Workspace' });
    });

    it('doesnt handle a full path ', () => {
      const pathname = '/ws/test/xyz';
      const result = parseUrlPath.pageWsHome({ pathname });
      expect(result).toEqual(null);
    });

    it('should return null when wsName is missing', () => {
      const pathname = '/ws/';
      const result = parseUrlPath.pageWsHome({ pathname });
      expect(result).toBeNull();
    });

    it('should return null when pathname does not match', () => {
      const pathname = '/invalid/path';
      const result = parseUrlPath.pageWsHome({ pathname });
      expect(result).toBeNull();
    });
  });

  describe('pageNativeFsAuthFailed', () => {
    it('should parse pathname into wsName', () => {
      const pathname = '/ws-auth/failed/native-fs/myWorkspace';
      const result = parseUrlPath.pageNativeFsAuthFailed({ pathname });
      expect(result).toEqual({ wsName: 'myWorkspace' });
    });

    it('should handle special characters in wsName', () => {
      const pathname = '/ws-auth/failed/native-fs/my Workspace';
      const result = parseUrlPath.pageNativeFsAuthFailed({ pathname });
      expect(result).toEqual({ wsName: 'my Workspace' });
    });

    it('should return null when wsName is missing', () => {
      const pathname = '/ws-auth/failed/native-fs/';
      const result = parseUrlPath.pageNativeFsAuthFailed({ pathname });
      expect(result).toBeNull();
    });

    it('should return null when pathname does not match', () => {
      const pathname = '/invalid/path';
      const result = parseUrlPath.pageNativeFsAuthFailed({ pathname });
      expect(result).toBeNull();
    });
  });

  describe('pageNativeFsAuthReq', () => {
    it('should parse pathname into wsName', () => {
      const pathname = '/ws-auth/req/native-fs/myWorkspace';
      const result = parseUrlPath.pageNativeFsAuthReq({ pathname });
      expect(result).toEqual({ wsName: 'myWorkspace' });
    });

    it('should handle special characters in wsName', () => {
      const pathname = '/ws-auth/req/native-fs/my Workspace';
      const result = parseUrlPath.pageNativeFsAuthReq({ pathname });
      expect(result).toEqual({ wsName: 'my Workspace' });
    });

    it('should return null when wsName is missing', () => {
      const pathname = '/ws-auth/req/native-fs/';
      const result = parseUrlPath.pageNativeFsAuthReq({ pathname });
      expect(result).toBeNull();
    });

    it('should return null when pathname does not match', () => {
      const pathname = '/invalid/path';
      const result = parseUrlPath.pageNativeFsAuthReq({ pathname });
      expect(result).toBeNull();
    });
  });

  describe('pageNotFound', () => {
    it('should return an empty object when pathname matches', () => {
      const pathname = '/ws-error/404';
      const result = parseUrlPath.pageNotFound({ pathname });
      expect(result).toEqual({});
    });

    it('should return null when pathname does not match', () => {
      const pathname = '/ws-error/other';
      const result = parseUrlPath.pageNotFound({ pathname });
      expect(result).toBeNull();
    });
  });

  describe('pageWorkspaceNotFound', () => {
    it('should parse pathname into wsName', () => {
      const pathname = '/ws-error/no-ws/myWorkspace';
      const result = parseUrlPath.pageWorkspaceNotFound({ pathname });
      expect(result).toEqual({ wsName: 'myWorkspace' });
    });

    it('should handle special characters in wsName', () => {
      const pathname = '/ws-error/no-ws/my Workspace';
      const result = parseUrlPath.pageWorkspaceNotFound({ pathname });
      expect(result).toEqual({ wsName: 'my Workspace' });
    });

    it('should return null when wsName is missing', () => {
      const pathname = '/ws-error/no-ws/';
      const result = parseUrlPath.pageWorkspaceNotFound({ pathname });
      expect(result).toBeNull();
    });

    it('should return null when pathname does not match', () => {
      const pathname = '/ws-error/other';
      const result = parseUrlPath.pageWorkspaceNotFound({ pathname });
      expect(result).toBeNull();
    });
  });

  describe('pageWsPathNotFound', () => {
    it('should parse pathname into wsPath', () => {
      const pathname = '/ws-error/no-path/myWorkspace:file.md';
      const result = parseUrlPath.pageWsPathNotFound({ pathname });
      expect(result).toEqual({ wsPath: 'myWorkspace:file.md' });
    });

    it('should handle special characters in wsPath', () => {
      const pathname = '/ws-error/no-path/my Workspace:file path.md';
      const result = parseUrlPath.pageWsPathNotFound({ pathname });
      expect(result).toEqual({ wsPath: 'my Workspace:file path.md' });
    });

    it('should return null when wsPath is missing', () => {
      const pathname = '/ws-error/no-path/';
      const result = parseUrlPath.pageWsPathNotFound({ pathname });
      expect(result).toBeNull();
    });

    it('should return null when pathname does not match', () => {
      const pathname = '/ws-error/other';
      const result = parseUrlPath.pageWsPathNotFound({ pathname });
      expect(result).toBeNull();
    });
  });

  describe('pageFatalError', () => {
    it('should return an empty object when pathname matches', () => {
      const pathname = '/ws-error/fatal-error';
      const result = parseUrlPath.pageFatalError({ pathname });
      expect(result).toEqual({});
    });

    it('should return null when pathname does not match', () => {
      const pathname = '/ws-error/other';
      const result = parseUrlPath.pageFatalError({ pathname });
      expect(result).toBeNull();
    });
  });

  describe('pageWelcome', () => {
    it('should return an empty object when pathname is "/"', () => {
      const pathname = '/';
      const result = parseUrlPath.pageWelcome({ pathname });
      expect(result).toEqual({});
    });

    it('should return null when pathname does not match', () => {
      const pathname = '/not-home';
      const result = parseUrlPath.pageWelcome({ pathname });
      expect(result).toBeNull();
    });
  });
});
