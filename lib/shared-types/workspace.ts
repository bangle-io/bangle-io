import { WorkspaceTypeHelp, WorkspaceTypeNative } from '@bangle.io/constants';

export type WorkspaceInfo =
  | {
      name: string;
      type: string;
      deleted?: boolean;
      lastModified: number;
      metadata: {
        [k: string]: any;
      };
    }
  | {
      name: string;
      type: typeof WorkspaceTypeNative;
      deleted?: boolean;
      lastModified: number;
      metadata: {
        rootDirHandle: any;
        [k: string]: any;
      };
    }
  | {
      name: string;
      type: typeof WorkspaceTypeHelp;
      deleted?: boolean;
      lastModified: number;
      metadata: {
        [k: string]: any;
      };
    };
