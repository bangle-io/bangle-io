import idb from 'idb-keyval';

import { IndexedDBFileSystem } from '@bangle.io/baby-fs';
import { WorkspaceType } from '@bangle.io/constants';
import type { WorkspaceInfo } from '@bangle.io/shared-types';

import { createPMNode } from './create-pm-node';

jest.mock('@bangle.io/baby-fs', () => {
  const actual = jest.requireActual('@bangle.io/baby-fs');
  return {
    ...actual,
    IndexedDBFileSystem: jest.fn(),
  };
});

jest.mock('idb-keyval', () => {
  return {
    get: jest.fn(),
    del: jest.fn(),
    set: jest.fn(),
    key: jest.fn(),
  };
});

if (typeof jest === 'undefined') {
  throw new Error('Can only be with jest');
}

function createDoc(textContent = 'hello') {
  return JSON.stringify({
    content: [
      {
        content: [{ text: textContent, type: 'text' }],
        type: 'paragraph',
      },
    ],
    type: 'doc',
  });
}

export const idbMock = {
  idbFS: undefined as IndexedDBFileSystem | undefined,
  mockStore: new Map(),
  mockBabyFSStore: new Map(),
  setupMockWorkspace: (wsInfo: Partial<WorkspaceInfo>) => {
    wsInfo = Object.assign(
      {
        lastModified: 1,
        deleted: false,
        metadata: {},
        type: WorkspaceType['browser'],
      },
      wsInfo,
    );
    const existing = idbMock.mockStore.get('workspaces/2') || [];
    if (existing.find((w) => w.name === wsInfo.name)) {
      throw new Error(`${wsInfo.name} workspace already exists`);
    }
    idbMock.mockStore.set('workspaces/2', [...existing, wsInfo]);
  },
  setupMockFile: async (wsName, filePath) => {
    await idbMock.idbFS?.writeFile(wsName + '/' + filePath, createDoc() as any);
  },
  setupMockFileFromMd: async (wsName, filePath, md, extensions = []) => {
    const str = JSON.stringify(createPMNode(extensions, md).toJSON());
    await idbMock.idbFS?.writeFile(wsName + '/' + filePath, str as any);
  },
};

(idb as any).get = jest.fn(async (a) => {
  return idbMock.mockStore.get(a);
});
(idb as any).del = jest.fn(async (key) => {
  return idbMock.mockStore.delete(key);
});
(idb as any).set = jest.fn(async (key, val) => {
  return idbMock.mockStore.set(key, val);
});
(idb as any).keys = jest.fn(async () => {
  return Array.from(idbMock.mockStore.keys());
});

export const resetIndexeddb = () => {
  idbMock.mockStore.clear();
  idbMock.mockBabyFSStore.clear();

  const obj = {
    readFileAsText: jest.fn(async (fileName) => {
      return idbMock.mockBabyFSStore.get(fileName);
    }),
    writeFile: jest.fn(async (fileName, data) => {
      idbMock.mockBabyFSStore.set(fileName, data);
    }),
    unlink: jest.fn(async (fileName) => {
      idbMock.mockBabyFSStore.delete(fileName);
    }),
    rename: jest.fn(async (a, b) => {
      idbMock.mockBabyFSStore.set(b, idbMock.mockBabyFSStore.get(a));
      idbMock.mockBabyFSStore.delete(a);
    }),
    readFile: jest.fn(async (fileName) => {
      return idbMock.mockBabyFSStore.get(fileName);
    }),
    opendirRecursive: jest.fn(async (dirPath) => {
      if (!dirPath.endsWith('/')) {
        dirPath += '/';
      }

      return Array.from(idbMock.mockBabyFSStore.keys()).filter((k) =>
        k.startsWith(dirPath),
      );
    }),
  };

  (IndexedDBFileSystem as any).mockImplementation(() => {
    return obj;
  });

  idbMock.idbFS = new IndexedDBFileSystem();

  return idbMock;
};
