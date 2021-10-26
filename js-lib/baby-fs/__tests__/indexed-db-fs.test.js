import * as idb from 'idb-keyval';

import { IndexedDBFileSystem } from '../indexed-db-fs';

let mockStore = new Map();
let mockMetaStore = new Map();

const getLast = (array) => array[array.length - 1];

const toFile = (str) => {
  var file = new File([str], 'foo.txt', { type: 'text/plain' });
  return file;
};

const serializeMap = (map) => {
  return Promise.all(
    [...map.entries()].map(async (r) => [r[0], await r[1]?.text()]),
  );
};

jest.mock('idb-keyval', () => {
  const idb = {};
  const dbSuffix = 3;

  idb.createStore = (dbName) => {
    return dbName;
  };

  const getStore = (args) => {
    if (getLast(args) === `baby-idb-meta-${dbSuffix}`) {
      return mockMetaStore;
    } else {
      return mockStore;
    }
  };

  idb.get = jest.fn(async (...args) => {
    return getStore(args).get(...args);
  });
  idb.del = jest.fn(async (...args) => {
    return getStore(args).delete(...args);
  });
  idb.set = jest.fn(async (...args) => {
    return getStore(args).set(...args);
  });
  idb.keys = jest.fn(async (...args) => {
    return Array.from(getStore(args).keys(...args));
  });
  return idb;
});

const originalFile = window.File;
beforeEach(() => {
  mockStore?.clear();
  mockMetaStore?.clear();
  window.File = class File {
    constructor(content, fileName, opts) {
      this.content = content;
      this.fileName = fileName;
      this.opts = opts;
    }
    async text() {
      return this.content;
    }
  };
});

afterEach(() => {
  window.File = originalFile;
});
test('writeFile', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('my-data'));
  await expect(serializeMap(mockStore)).resolves.toMatchInlineSnapshot(`
          Array [
            Array [
              "hola/hi",
              Array [
                "my-data",
              ],
            ],
          ]
        `);
  expect(mockMetaStore.get('hola/hi')).toEqual({
    mtimeMs: expect.any(Number),
  });
});

test('readFile', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('my-data'));

  const data = await fs.readFileAsText('hola/hi');
  expect(data).toMatchInlineSnapshot(`
    Array [
      "my-data",
    ]
  `);
});

test('stat', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('my-data'));

  const data = await fs.stat('hola/hi');
  expect(data).toEqual({
    mtimeMs: expect.any(Number),
  });
});

test('stat throws error if file not found', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('my-data'));

  await expect(
    fs.stat('hola/unknown'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"BABY_FS_FILE_NOT_FOUND_ERROR:File hola/unknown not found"`,
  );
});

test('rename', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('mydata'));
  await fs.rename('hola/hi', 'ebola/two');
  await expect(serializeMap(mockStore)).resolves.toMatchInlineSnapshot(`
          Array [
            Array [
              "ebola/two",
              Array [
                "mydata",
              ],
            ],
          ]
        `);
});

test('rename throws error if old file not found', async () => {
  const fs = new IndexedDBFileSystem();

  await expect(
    fs.rename('hola/hi', 'ebola/two'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"BABY_FS_FILE_NOT_FOUND_ERROR:File hola/hi not found"`,
  );
});

test('rename throws error if new file already exists', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('mydata'));
  await fs.writeFile('ebola/two', toFile('mydata'));

  await expect(
    fs.rename('hola/hi', 'ebola/two'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"BABY_FS_FILE_ALREADY_EXISTS_ERROR:File already exists"`,
  );
});

test('unlink', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('my-data'));
  await fs.unlink('hola/hi');
  expect(mockStore.size).toEqual(0);
  expect(mockMetaStore.size).toEqual(0);
});

test('opendirRecursive root', async () => {
  const fs = new IndexedDBFileSystem();

  await fs.writeFile('hola/hi', toFile('my-data'));
  await fs.writeFile('hola/bye', toFile('my-data'));
  const result = await fs.opendirRecursive('hola');
  expect(result).toMatchInlineSnapshot(`
    Array [
      "hola/hi",
      "hola/bye",
    ]
  `);
});

test('opendirRecursive subdir', async () => {
  const fs = new IndexedDBFileSystem();

  await fs.writeFile('hola/hi', toFile('my-data'));
  await fs.writeFile('hola/bye', toFile('my-data'));
  await fs.writeFile('holamagic/bye', toFile('my-data'));
  await fs.writeFile('jango/bye', toFile('my-data'));
  let result = await fs.opendirRecursive('jango/');
  expect(result).toMatchInlineSnapshot(`
    Array [
      "jango/bye",
    ]
  `);

  result = await fs.opendirRecursive('hola');
  expect(result).toMatchInlineSnapshot(`
    Array [
      "hola/hi",
      "hola/bye",
    ]
  `);

  result = await fs.opendirRecursive('holamagic');
  expect(result).toMatchInlineSnapshot(`
    Array [
      "holamagic/bye",
    ]
  `);
});
