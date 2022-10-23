import { NativeBrowserFileSystem } from '@bangle.io/baby-fs';
import { WorkspaceTypePrivateFileSystem } from '@bangle.io/constants';

import {
  allowedFile,
  NativeFsStorageProvider,
} from './nativefs-storage-provider';

export class PrivateFsStorageProvider extends NativeFsStorageProvider {
  name = WorkspaceTypePrivateFileSystem;
  displayName = 'Private file system storage';
  description = 'Saves data in your browsers file system storage';

  protected async _getFs(wsName: string) {
    const rootDirHandle = await navigator.storage.getDirectory();
    const parentDir = await rootDirHandle.getDirectoryHandle(wsName, {
      create: true,
    });

    return new NativeBrowserFileSystem({
      rootDirHandle: parentDir,
      allowedFile: ({ name }) => allowedFile(name),
    });
  }
}
