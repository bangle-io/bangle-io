import { Extension } from '@bangle.io/extension-registry';
import { IndexedDbStorageProvider } from '@bangle.io/storage';

import { browserStorageSlice } from './browser-storage-slice';

const extensionName = '@bangle.io/browser-storage';

const extension = Extension.create({
  name: extensionName,
  application: {
    slices: [browserStorageSlice()],
    storageProvider: new IndexedDbStorageProvider(),
    onStorageError: (error, store) => {
      return false;
    },
    // operations: [],
    // operationHandler() {
    //   return {
    //     handle(operation, _, bangleStore) {
    //       // switch (operation.name) {
    //       //   default: {
    //       //     return undefined;
    //       //   }
    //       // }
    //     },
    //   };
    // },
  },
});

export default extension;
