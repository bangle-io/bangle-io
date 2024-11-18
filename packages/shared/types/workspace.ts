export type WorkspaceInfo = {
  name: string;
  type: string;
  deleted?: boolean;
  lastModified: number;
  metadata: Record<string, any>;
};

export type WorkspaceDatabaseQueryOptions = {
  type?: WorkspaceInfo['type'];
  allowDeleted?: boolean;
};
