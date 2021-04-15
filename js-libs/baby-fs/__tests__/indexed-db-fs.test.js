import { IndexedDBFileSystem } from '../indexed-db-fs';
import * as idb from 'idb-keyval';

let mockStore = new Map();
let mockMetaStore = new Map();

const getLast = (array) => array[array.length - 1];

jest.mock('idb-keyval', () => {
  const idb = {};

  idb.createStore = (dbName) => {
    return dbName;
  };

  const getStore = (args) => {
    if (getLast(args) === 'baby-fs-meta-db1') {
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

beforeEach(() => {
  mockStore?.clear();
  mockMetaStore?.clear();
});

test('writeFile', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('/hola/hi', 'my-data');
  expect(mockStore).toMatchInlineSnapshot(`
    Map {
      "/hola/hi" => "my-data",
    }
  `);
  expect(mockMetaStore.get('/hola/hi')).toEqual({
    ctimeMs: expect.any(Number),
    mtimeMs: expect.any(Number),
  });
});

test('readFile', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('/hola/hi', 'my-data');

  const data = await fs.readFile('/hola/hi');
  expect(data).toMatchInlineSnapshot(`"my-data"`);
});

test('stat', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('/hola/hi', 'my-data');

  const data = await fs.stat('/hola/hi');
  expect(data).toEqual({
    ctimeMs: expect.any(Number),
    mtimeMs: expect.any(Number),
  });
});

test('rename', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('/hola/hi', 'mydata');
  await fs.rename('/hola/hi', '/ebola/two');
  expect(mockStore).toMatchInlineSnapshot(`
    Map {
      "/ebola/two" => "mydata",
    }
  `);
});

test('rename throws error if old file not found', async () => {
  const fs = new IndexedDBFileSystem();

  await expect(
    fs.rename('/hola/hi', '/ebola/two'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"FILE_NOT_FOUND_ERROR:File /hola/hi not found"`,
  );
});

test('rename throws error if new file already exists', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('/hola/hi', 'mydata');
  await fs.writeFile('/ebola/two', 'mydata');

  await expect(
    fs.rename('/hola/hi', '/ebola/two'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"FILE_ALREADY_EXISTS_ERROR:File already exists"`,
  );
});

test('unlink', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('/hola/hi', 'my-data');
  await fs.unlink('/hola/hi');
  expect(mockStore.size).toEqual(0);
  expect(mockMetaStore.size).toEqual(0);
});

test('opendirRecursive root', async () => {
  const fs = new IndexedDBFileSystem();

  await fs.writeFile('/hola/hi', 'my-data');
  await fs.writeFile('/hola/bye', 'my-data');
  const result = await fs.opendirRecursive('/');
  expect(result).toMatchInlineSnapshot(`
    Array [
      "/hola/hi",
      "/hola/bye",
    ]
  `);
});

test('opendirRecursive subdir', async () => {
  const fs = new IndexedDBFileSystem();

  await fs.writeFile('/hola/hi', 'my-data');
  await fs.writeFile('/hola/bye', 'my-data');
  await fs.writeFile('/jango/bye', 'my-data');
  let result = await fs.opendirRecursive('/jango');
  expect(result).toMatchInlineSnapshot(`
    Array [
      "/jango/bye",
    ]
  `);

  result = await fs.opendirRecursive('/hola');
  expect(result).toMatchInlineSnapshot(`
    Array [
      "/hola/hi",
      "/hola/bye",
    ]
  `);
});
