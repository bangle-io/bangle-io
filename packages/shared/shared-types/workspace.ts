export type WorkspaceInfo = {
  name: string;
  type: string;
  deleted?: boolean;
  lastModified: number;
  metadata: Record<string, any>;
};
