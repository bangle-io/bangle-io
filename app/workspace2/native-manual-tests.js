import * as idb from 'idb-keyval';

/**
 * Manual TESTS
 */

import {
  NativeFileOps,
  pickADirectory,
  requestPermission,
} from './nativefs-helpers';

// a poorman semimanual test
window.nativeFSTest1 = async function () {
  console.info('pick bangle.dev directory');
  const dirHandle = await pickADirectory();
  console.log({ dirHandle });

  const fileOps = new NativeFileOps();
  console.log({ fileOps });

  console.info(
    'reading README.md, expect READMEs content and a faster second read',
  );
  console.time('firstRead');
  let { textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'README.md'],
    dirHandle,
  );
  console.timeEnd('firstRead');
  console.time('secondRead');

  ({ textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'README.md'],
    dirHandle,
  ));

  console.timeEnd('secondRead');

  console.log({ fileContent });
  console.info('attempted to read non existent file, expect not found error');
  await fileOps
    .readFile([dirHandle.name, 'README'], dirHandle)
    .then(() => console.warn('should have failed'))
    .catch((error) => {
      console.error(error);
    });

  console.info("reading deeply nested file , expect md's content");
  ({ textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'markdown', '__tests__', 'fixtures', 'todo1.md'],
    dirHandle,
  ));

  console.log({ fileContent });

  console.info('reading a folder , should fail');
  await fileOps
    .readFile([dirHandle.name, 'markdown', '__tests__', 'fixtures'], dirHandle)
    .then(() => console.warn('should have failed'))
    .catch((error) => {
      console.error(error);
    });
  console.log('done');
};

//  testing file renaming and deletion
window.nativeFSTest2 = async function* () {
  console.log('pick bangle.dev directory');
  const dirHandle = await pickADirectory();
  console.log({ dirHandle });

  const fileOps = new NativeFileOps();
  console.log({ fileOps });

  console.info('create dummy.md, expect dummys content');

  yield null;

  let { textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'dummy.md'],
    dirHandle,
  );
  console.log({ fileContent });
  console.info('now rename dummy.md to dummy2.md and  expect not found error');
  yield null;

  await fileOps
    .readFile([dirHandle.name, 'dummy.md'], dirHandle)
    .then(() => console.warn('should have failed'))
    .catch((error) => {
      console.error(error);
    });

  console.info('now reading dummy2.md expect contents');

  ({ textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'dummy2.md'],
    dirHandle,
  ));
  console.log({ fileContent });

  console.info('now delete dummy2.md and copy the content');

  yield null;

  console.info('now will attempt to read deleted dummy2.md should throw error');
  await fileOps
    .readFile([dirHandle.name, 'dummy2.md'], dirHandle)
    .then(() => console.warn('should have failed'))
    .catch((error) => {
      console.error(error);
    });

  console.info('now bring back dummy2.md and will  attempt to read it');
  yield null;
  ({ textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'dummy2.md'],
    dirHandle,
  ));
  console.log({ fileContent });

  console.log('done!');
};

const customStore = idb.createStore(
  'test-permission-db-1',
  'test-permission-store-1',
);

window.nativeFSPermissionTestSave = async function () {
  const dirHandle = await pickADirectory();
  console.info('will be saving the handle and then reload and call read test');
  await idb.set('bangledev', dirHandle, customStore);
};

window.nativeFSPermissionTestRequestPermission = async function () {
  const dirHandle = await idb.get('bangledev', customStore);
  await requestPermission(dirHandle);
  return dirHandle;
};

window.nativeFSPermissionTestRead = async function () {
  const dirHandle = await idb.get('bangledev', customStore);
  console.log({ dirHandle });
  const fileOps = new NativeFileOps();
  let { textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'README.md'],
    dirHandle,
  );
  console.log({ fileContent });
};
const fileOps = new NativeFileOps();

window.nativeFSPermissionTestWrite = async function (content = 'hi') {
  const dirHandle = await idb.get('bangledev', customStore);
  let fileContent = await fileOps.saveFile(
    [dirHandle.name, 'dummy.md'],
    dirHandle,
    content,
  );
  console.log({ fileContent });
};

window.nativeFSPermissionWrite2 = async function* (content = 'hi') {
  console.info('pick a temp directory as it will become noisy');

  console.info('creating file ./dummy.md');
  const dirHandle = await pickADirectory();
  await fileOps.saveFile([dirHandle.name, 'dummy.md'], dirHandle, content);
  let { textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'dummy.md'],
    dirHandle,
  );

  console.assert(fileContent === content, 'content 0 must match');

  console.info('creating file ,/a/b/c/dummy.md');
  await fileOps.saveFile(
    [dirHandle.name, 'a', 'b', 'c', 'dummy.md'],
    dirHandle,
    content,
  );
  ({ textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'a', 'b', 'c', 'dummy.md'],
    dirHandle,
  ));

  console.assert(fileContent === content, 'content1 must match');
  yield null;

  console.info(
    'create file  ./a/b/dummy.md nested in dirs but with no dir creation',
  );
  await fileOps.saveFile(
    [dirHandle.name, 'a', 'b', 'dummy.md'],
    dirHandle,
    content,
  );

  ({ textContent: fileContent } = await fileOps.readFile(
    [dirHandle.name, 'a', 'b', 'dummy.md'],
    dirHandle,
  ));

  console.assert(fileContent === content, 'content 2 must match');
};
