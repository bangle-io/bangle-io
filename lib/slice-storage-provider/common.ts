import { SliceKey } from '@bangle.io/create-store';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import type { BaseStorageProvider } from '@bangle.io/storage';

export interface StorageProviderErrorInfo {
  serializedError: string;
  wsName: string;
  workspaceType: WorkspaceInfo['type'];
  uid: string;
}

export type StorageProviderAction = {
  name: 'action::@bangle.io/slice-storage-provider:set-storage-provider-error';
  value: StorageProviderErrorInfo;
};

export const storageProviderSliceKey = new SliceKey<
  {
    errors: StorageProviderErrorInfo[];
  },
  StorageProviderAction
>('@bangle.io/slice-storage-provider/slice-key');

export const errorMap = new WeakMap<
  Error,
  {
    wsName: string;
    provider: BaseStorageProvider;
    uid: string;
    workspaceType: string;
  }
>();
