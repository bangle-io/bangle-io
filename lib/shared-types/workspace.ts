import type { Brand } from '@bangle.io/mini-js-utils';

// TODO move types to Nominal WsName
export type WorkspaceInfo = {
  name: string;
  type: string;
  deleted?: boolean;
  lastModified: number;
  metadata: {
    [k: string]: any;
  };
};

export type WsName = Brand<string, 'WsName'>;
export type WsPath = Brand<string, 'WsPath'>;

export type StorageProviderChangeType =
  // TODO move types to Nominal WsPath
  | { type: 'create'; wsPath: string }
  | { type: 'write'; wsPath: string }
  | { type: 'rename'; oldWsPath: string; newWsPath: string }
  | { type: 'delete'; wsPath: string };

export type StorageProviderOnChange = (type: StorageProviderChangeType) => void;
