import { IndexedDBFileSystem } from 'baby-fs';

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

const mockExport = {
  idbFS: undefined,
  mockStore: new Map(),
  mockBabyFSStore: new Map(),
  setupMockWorkspace: ({ name, type = 'browser', metadata = {} } = {}) => {
    const existing = mockExport.mockStore.get('workspaces/2') || [];
    if (existing.find((w) => w.name === name)) {
      throw new Error(`${name} workspace already exists`);
    }
    mockExport.mockStore.set('workspaces/2', [
      ...existing,
      {
        name,
        type,
        metadata,
      },
    ]);
  },
  setupMockFile: async (wsName, filePath) => {
    await mockExport.idbFS.writeFile(wsName + '/' + filePath, createDoc());
  },
};

jest.mock('baby-fs', () => {
  const actual = jest.requireActual('baby-fs');
  return {
    ...actual,
    IndexedDBFileSystem: jest.fn(),
  };
});

jest.mock('idb-keyval', () => {
  const idb = {};
  idb.get = jest.fn(async (...args) => {
    return mockExport.mockStore.get(...args);
  });
  idb.del = jest.fn(async (...args) => {
    return mockExport.mockStore.delete(...args);
  });
  idb.set = jest.fn(async (...args) => {
    return mockExport.mockStore.set(...args);
  });
  idb.keys = jest.fn(async (...args) => {
    return Array.from(mockExport.mockStore.keys(...args));
  });
  return idb;
});

beforeEach(() => {
  mockExport.mockStore.clear();
  mockExport.mockBabyFSStore.clear();

  const obj = {
    readFileAsText: jest.fn(async (fileName) => {
      return mockExport.mockBabyFSStore.get(fileName);
    }),
    writeFile: jest.fn(async (fileName, data) => {
      mockExport.mockBabyFSStore.set(fileName, data);
    }),
    unlink: jest.fn(async (fileName) => {
      mockExport.mockBabyFSStore.delete(fileName);
    }),
    rename: jest.fn(async (a, b) => {
      mockExport.mockBabyFSStore.set(b, mockExport.mockBabyFSStore.get(a));
      mockExport.mockBabyFSStore.delete(a);
    }),
    readFile: jest.fn(async (fileName) => {
      return mockExport.mockBabyFSStore.get(fileName);
    }),
    opendirRecursive: jest.fn(async (dirPath) => {
      if (!dirPath.endsWith('/')) {
        dirPath += '/';
      }

      return Array.from(mockExport.mockBabyFSStore.keys()).filter((k) =>
        k.startsWith(dirPath),
      );
    }),
  };

  IndexedDBFileSystem.mockImplementation(() => {
    return obj;
  });

  mockExport.idbFS = new IndexedDBFileSystem();
});

export default mockExport;
