import * as idb from 'idb-keyval';

import { IndexedDBFileSystem } from '@bangle.io/baby-fs';
import { WorkspaceType } from '@bangle.io/constants';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { resolvePath } from '@bangle.io/ws-path';

export const setupMockFile = async (
  wsName,
  filePath,
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
      type: WorkspaceType['browser'],
    },
    wsInfo,
  );

  const existing = (await idb.get('workspaces/2')) || [];
  if (existing.find((w) => w.name === wsInfo.name)) {
    throw new Error(`${wsInfo.name} workspace already exists`);
  }
  await idb.set('workspaces/2', [...existing, wsInfo]);
};

const originalFile = global.File;

export const beforeEachHook = () => {
  (global as any).File = class File {
    constructor(public content, public fileName, public opts) {
      this.content = content;
      this.fileName = fileName;
      this.opts = opts;
    }
    async text() {
      return this.content?.[0];
    }
  };
};

export const afterEachHook = () => {
  (global as any).File = originalFile;
};
