export const PAGE_ROUTE = {
  workspaceSelect: 'WorkspaceSelect',
  workspaceHome: 'WorkspaceHome',
  workspaceNativeFsAuth: 'WorkspaceNativeFsAuth',

  editor: 'Editor',
  notFound: 'NotFound',
  unknown: 'Unknown',
  root: 'Root', // the '/' route
} as const;

export type PageRoute = (typeof PAGE_ROUTE)[keyof typeof PAGE_ROUTE];
