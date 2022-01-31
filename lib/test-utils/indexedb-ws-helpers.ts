import * as idb from 'idb-keyval';

import { IndexedDBFileSystem } from '@bangle.io/baby-fs';
import { WorkspaceTypeBrowser } from '@bangle.io/constants';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { resolvePath } from '@bangle.io/ws-path';

export const setupMockFile = async (
  wsName: string,
  filePath: string,
  content = '# Hola\n\nHello world!',
) => {
  const idbFS = new IndexedDBFileSystem();

  await idbFS.writeFile(
    wsName + '/' + filePath,
    new File([content], resolvePath(wsName + ':' + filePath).fileName, {
      type: 'text/plain',
    }),
  );
};

export const setupMockWorkspace = async (wsInfo: Partial<WorkspaceInfo>) => {
  wsInfo = Object.assign(
    {
      lastModified: 1,
      deleted: false,
      metadata: {},
      type: WorkspaceTypeBrowser,
    },
    wsInfo,
  );

  const existing = (await idb.get('workspaces/2')) || [];
  if (existing.find((w: WorkspaceInfo) => w.name === wsInfo.name)) {
    throw new Error(`${wsInfo.name} workspace already exists`);
  }
  await idb.set('workspaces/2', [...existing, wsInfo]);
};

export const beforeEachHook = () => {
  interface MockFile {
    parts: (string | Blob | ArrayBuffer | ArrayBufferView)[];
    filename: string;
    properties: FilePropertyBag;
  }

  // Global file mock
  (global as any).File = class File implements MockFile {
    constructor(
      public parts: MockFile['parts'],
      public filename: MockFile['filename'],
      public properties: MockFile['properties'],
    ) {
      this.filename = filename;
      this.properties = properties;
      this.parts = parts;
    }
    async text() {
      return this.parts?.[0];
    }
  };
};

export const afterEachHook = () => {};
