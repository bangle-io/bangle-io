import type { Brand } from '@bangle.io/mini-js-utils';

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

export type WsName = Brand<string, 'WsName'>;
export type WsPath = Brand<string, 'WsPath'>;
