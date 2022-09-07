import { SliceKey } from '@bangle.io/create-store';

export type StorageProviderAction =
  | {
      name: 'action::@bangle.io/slice-storage-provider:update-apple';
      value: {
        apple: string;
      };
    }
  | {
      name: 'action::@bangle.io/slice-storage-provider:update-banana';
      value: {
        banana: number;
      };
    };

export const storageProviderKey = new SliceKey<
  {
    apple: string;
    banana: number;
  },
  StorageProviderAction
>('@bangle.io/slice-storage-provider/slice-key');
