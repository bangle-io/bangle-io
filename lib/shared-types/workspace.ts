export type WorkspaceInfo = {
  name: string;
  type: string;
  deleted?: boolean;
  lastModified: number;
  metadata: {
    [k: string]: any;
  };
};

export type { WorkspaceSliceAction } from '@bangle.io/slice-workspace';
