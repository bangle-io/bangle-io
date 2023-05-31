import { Extension } from '@bangle.io/extension-registry';
import { HelpFsStorageProvider } from '@bangle.io/storage';

import { extensionName } from './common';

export default Extension.create({
  name: extensionName,
  application: {
    storageProvider: new HelpFsStorageProvider(),
    onStorageError: (error) => {
      return true;
    },
  },
});
