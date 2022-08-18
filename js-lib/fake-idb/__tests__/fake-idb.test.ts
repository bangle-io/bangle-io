import '../auto-mock';

import * as idb from 'idb';

test('works', async () => {
  const db = await idb.openDB('test-db', 1, {
    upgrade(database, oldVersion, newVersion, transaction) {
      if (!database.objectStoreNames.contains('my-store')) {
        database.createObjectStore('my-store', {
          keyPath: 'uid',
        });
      }
    },
  });

  await db.put('my-store', {
    uid: 'my-uid',
    test: '1',
  });

  const result = await db.get('my-store', 'my-uid');

  expect(result).toEqual({
    test: '1',
    uid: 'my-uid',
  });
});

test('is reset after every test', async () => {
  const db = await idb.openDB('test-db', 1, {
    upgrade(database, oldVersion, newVersion, transaction) {
      if (!database.objectStoreNames.contains('my-store')) {
        database.createObjectStore('my-store', {
          keyPath: 'uid',
        });
      }
    },
  });

  const result = await db.get('my-store', 'my-uid');

  expect(result).toEqual(undefined);
});

test('handles files', async () => {
  const db = await idb.openDB('test-db', 1, {
    upgrade(database, oldVersion, newVersion, transaction) {
      if (!database.objectStoreNames.contains('my-store')) {
        database.createObjectStore('my-store', {
          keyPath: 'uid',
        });
      }
    },
  });

  await db.put('my-store', {
    uid: 'my-uid',
    stupid: {
      fileName: '1',
      file: new File([new Blob(['test'])], '1'),
    },
  });
  const result = await db.get('my-store', 'my-uid');
  expect(result).toEqual({
    uid: 'my-uid',
    stupid: {
      fileName: '1',
      file: new File([new Blob(['test'])], '1'),
    },
  });
});

test('handles multiple files', async () => {
  const db = await idb.openDB('test-db', 1, {
    upgrade(database, oldVersion, newVersion, transaction) {
      if (!database.objectStoreNames.contains('my-store')) {
        database.createObjectStore('my-store', {
          keyPath: 'uid',
        });
      }
    },
  });

  await db.put('my-store', {
    uid: 'my-uid',
    stupid: {
      fileName: '1',
      file: new File([new Blob(['test'])], '1'),
      very: {
        files: [
          new File([new Blob(['test-some-very-other-file-b'])], 'x-y-z'),
          new File([new Blob(['test-some-other-file-a'])], 'my-file-other-a'),
        ],
      },
    },
  });
  const result = await db.get('my-store', 'my-uid');

  expect(result).toEqual({
    uid: 'my-uid',
    stupid: {
      fileName: '1',
      file: new File([new Blob(['test'])], '1'),
      very: {
        files: [
          new File([new Blob(['test-some-very-other-file-b'])], 'x-y-z'),
          new File([new Blob(['test-some-other-file-a'])], 'my-file-other-a'),
        ],
      },
    },
  });
});
