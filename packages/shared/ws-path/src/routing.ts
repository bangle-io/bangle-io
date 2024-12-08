import { throwAppError } from '@bangle.io/base-utils';
import { ROUTES } from '@bangle.io/constants';
import type { RouterLocation } from '@bangle.io/types';
// wouter uses this regexparam
import { parse as parsePattern } from 'regexparam';
import { matchRoute } from 'wouter';
import { splitWsPath, validateWsPath } from './helpers';

const pageWsHome = ({ wsName }: { wsName: string }) => {
  return { pathname: '/ws/' + wsName, search: { p: null } };
};

// Rename this to buildUrlPath -> buildLocation
export const buildUrlPath = {
  pageFatalError: () => ({
    pathname: ROUTES.pageFatalError,
  }),
  pageWsHome,
  pageEditor: ({ wsPath }: { wsPath: string }) => {
    const result = validateWsPath(wsPath);
    if (!result.isValid) {
      throwAppError('error::ws-path:invalid-ws-path', result.reason, {
        invalidPath: result.invalidPath,
      });
    }
    const [wsName, filePath] = splitWsPath(wsPath);

    if (!wsName) {
      throwAppError('error::ws-path:invalid-ws-path', 'Invalid file wsPath', {
        invalidPath: wsPath,
      });
    }

    if (!filePath) {
      return pageWsHome({ wsName });
    }

    return { pathname: `/ws/${wsName}/editor`, search: { p: filePath } };
  },
  pageNativeFsAuthFailed: ({ wsName }: { wsName: string }) => {
    return { pathname: '/ws-auth/failed/native-fs/' + wsName };
  },
  pageNativeFsAuthReq: ({ wsName }: { wsName: string }) => {
    return { pathname: '/ws-auth/req/native-fs/' + wsName };
  },
  pageNotFound: ({ path }: { path?: string }) => ({
    pathname: ROUTES.pageNotFound,
    search: path ? { p: path } : { p: null },
  }),
  pageWorkspaceNotFound: ({ wsName }: { wsName: string }) => {
    return { pathname: '/ws-error/no-ws/' + wsName };
  },
  pageWsPathNotFound: ({ wsPath }: { wsPath: string }) => {
    return { pathname: '/ws-error/no-path/' + wsPath };
  },
  pageWelcome: () => ({
    pathname: ROUTES.pageWelcome,
  }),
} satisfies Record<
  string,
  (args: any) => { pathname: string; search?: RouterLocation['search'] }
>;

type ParseResult<T> = T | null;

export const parseUrlPath = {
  pageEditor({
    pathname,
    search = {},
  }: { pathname: string; search?: RouterLocation['search'] }): ParseResult<{
    wsPath: string;
  }> {
    const isMatch = matchRoute(parsePattern, ROUTES.pageEditor, pathname)[0];
    const match = matchRoute(parsePattern, ROUTES.pageEditor, pathname)[1];
    if (!isMatch || !match?.wsName) {
      return null;
    }

    const filePath = search.p;
    if (!filePath) {
      return null;
    }

    return {
      wsPath: `${match.wsName}:${filePath}`,
    };
  },

  pageWsHome({
    pathname,
  }: { pathname: string; search?: RouterLocation['search'] }): ParseResult<{
    wsName: string;
  }> {
    const [isMatch, match] = matchRoute(
      parsePattern,
      ROUTES.pageWsHome,
      pathname,
    );
    if (!isMatch || !match?.wsName) {
      return null;
    }
    return { wsName: match.wsName };
  },

  pageNativeFsAuthFailed({
    pathname,
  }: { pathname: string; search?: RouterLocation['search'] }): ParseResult<{
    wsName: string;
  }> {
    const [isMatch, match] = matchRoute(
      parsePattern,
      ROUTES.pageNativeFsAuthFailed,
      pathname,
    );
    if (!isMatch || !match?.wsName) {
      return null;
    }
    return { wsName: match.wsName };
  },

  pageNativeFsAuthReq({
    pathname,
  }: { pathname: string; search?: RouterLocation['search'] }): ParseResult<{
    wsName: string;
  }> {
    const [isMatch, match] = matchRoute(
      parsePattern,
      ROUTES.pageNativeFsAuthReq,
      pathname,
    );
    if (!isMatch || !match?.wsName) {
      return null;
    }
    return { wsName: match.wsName };
  },

  pageNotFound({
    pathname,
  }: { pathname: string; search?: RouterLocation['search'] }): ParseResult<
    Record<string, never>
  > {
    const [isMatch] = matchRoute(parsePattern, ROUTES.pageNotFound, pathname);
    return isMatch ? {} : null;
  },

  pageWorkspaceNotFound({
    pathname,
  }: { pathname: string; search?: RouterLocation['search'] }): ParseResult<{
    wsName: string;
  }> {
    const [isMatch, match] = matchRoute(
      parsePattern,
      ROUTES.pageWorkspaceNotFound,
      pathname,
    );
    if (!isMatch || !match?.wsName) {
      return null;
    }
    return { wsName: match.wsName };
  },

  pageWsPathNotFound({
    pathname,
  }: { pathname: string; search?: RouterLocation['search'] }): ParseResult<{
    wsPath: string;
  }> {
    const [isMatch, match] = matchRoute(
      parsePattern,
      ROUTES.pageWsPathNotFound,
      pathname,
    );
    if (!isMatch || !match?.wsPath) {
      return null;
    }
    return { wsPath: match.wsPath };
  },

  pageFatalError({
    pathname,
  }: { pathname: string; search?: RouterLocation['search'] }): ParseResult<
    Record<string, never>
  > {
    const [isMatch] = matchRoute(parsePattern, ROUTES.pageFatalError, pathname);
    return isMatch ? {} : null;
  },

  pageWelcome({
    pathname,
  }: { pathname: string; search?: RouterLocation['search'] }): ParseResult<
    Record<string, never>
  > {
    const [isMatch] = matchRoute(parsePattern, ROUTES.pageWelcome, pathname);
    return isMatch ? {} : null;
  },
};

export function buildURL(location: RouterLocation): string {
  const normalizedSearch: Record<string, string> = Object.fromEntries(
    Object.entries(location.search).filter(
      (arg): arg is [string, string] => arg[1] !== null,
    ),
  );
  const params = new URLSearchParams(normalizedSearch);

  let searchStr = params.toString();
  if (searchStr.length > 0) {
    searchStr = `?${searchStr}`;
  }

  return `${encodeURI(location.pathname)}${searchStr}`;
}
