import { NativeBrowserFileSystem } from '@bangle.io/baby-fs';
import { WorkspaceType } from '@bangle.io/constants';
import type { StorageProviderOnChange } from '@bangle.io/shared-types';
import { safeNavigatorStorageGetDirectory } from '@bangle.io/utils';

import {
  allowedFile,
  BaseFsStorageProvider,
} from './native-fs-storage-provider';

export class PrivateFsStorageProvider extends BaseFsStorageProvider {
  name = WorkspaceType.PrivateFS;
  displayName = 'Private file system storage';
  description = 'Saves data in your browsers file system storage';
  onChange: StorageProviderOnChange = () => {};

  isSupported() {
    return true;
  }

  async newWorkspaceMetadata() {
    return;
  }

  protected async _getFs(wsName: string) {
    const rootDirHandle = await safeNavigatorStorageGetDirectory();

    if (!rootDirHandle) {
      throw new Error('PrivateFS is not available in this browser');
    }

    const parentDir = await rootDirHandle.getDirectoryHandle(wsName, {
      create: true,
    });

    return new NativeBrowserFileSystem({
      rootDirHandle: parentDir,
      allowedFile: ({ name }) => allowedFile(name),
    });
  }
}
