import { Extension } from '@bangle.io/extension-registry';

import { NativsFsStorageProvider } from './nativefs-storage-provider';

const extensionName = '@bangle.io/browser-nativefs-storage';

const extension = Extension.create({
  name: extensionName,
  application: {
    slices: [],
    storageProvider: new NativsFsStorageProvider(),
  },
});

export default extension;
