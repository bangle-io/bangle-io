import type { WorkspaceType } from '@bangle.io/constants';

export type WorkspaceInfo =
  | {
      name: string;
      type: WorkspaceType;
      deleted?: boolean;
      lastModified: number;
      metadata: {
        [k: string]: any;
      };
    }
  | {
      name: string;
      type: WorkspaceType.nativefs;
      deleted?: boolean;
      lastModified: number;
      metadata: {
        rootDirHandle: any;
        [k: string]: any;
      };
    };
