export const ROUTES = {
  pageEditor: '/ws/:wsName/editor',
  pageWsHome: '/ws/:wsName',

  pageNativeFsAuthFailed: '/ws-auth/failed/native-fs/:wsName',
  pageNativeFsAuthReq: '/ws-auth/req/native-fs/:wsName',

  pageNotFound: '/ws-error/404',
  pageWorkspaceNotFound: '/ws-error/no-ws/:wsName',
  pageWsPathNotFound: '/ws-error/no-path/:wsPath',
  pageFatalError: '/ws-error/fatal-error',
  pageWelcome: '/',
} as const;
