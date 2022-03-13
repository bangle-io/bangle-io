import {
  LocalFileEntryManager,
  RemoteFileEntry,
} from '@bangle.io/remote-file-sync';

import { syncUntouchedEntries } from '../sync';

export const createFileBlob = (fileText: string): File =>
  new Blob([fileText], { type: 'text/plain' }) as any;

const createManager = () => {
  const store = new Map<string, any>();
  const manager = new LocalFileEntryManager({
    get: (key: string) => Promise.resolve(store.get(key)),
    set: (key: string, obj: any) => {
      store.set(key, obj);
      return Promise.resolve();
    },
    entries: () => Promise.resolve(Array.from(store.entries())),
    delete: (key: string) => {
      store.delete(key);
      return Promise.resolve();
    },
  });
  return { manager, store };
};

describe('syncUntouchedEntries', () => {
  test('blank test case', async () => {
    const controller = new AbortController();
    const { manager } = createManager();
    await syncUntouchedEntries(
      controller.signal,
      manager,
      'my-ws',
      async () => undefined,
    );
  });

  test('does not sync newly created files', async () => {
    const controller = new AbortController();
    const { manager } = createManager();
    await manager.createFile(
      'my-ws:foo.txt',
      createFileBlob('hello'),
      async () => undefined,
    );

    await syncUntouchedEntries(
      controller.signal,
      manager,
      'my-ws',
      async () => {
        return RemoteFileEntry.newFile({
          file: createFileBlob('hello 2'),
          uid: 'my-ws:foo.txt',
          deleted: undefined,
        });
      },
    );

    const file = await manager.readFile('my-ws:foo.txt', async () => undefined);

    expect(await file?.text()).toEqual('hello');
  });

  test('does not sync deleted files', async () => {
    const controller = new AbortController();
    const { manager } = createManager();

    let remoteCallback = async () =>
      RemoteFileEntry.newFile({
        file: createFileBlob('hello'),
        uid: 'my-ws:foo.txt',
        deleted: undefined,
      });
    // create a local entry for file foo
    expect(
      await manager.readFile('my-ws:foo.txt', remoteCallback),
    ).toBeTruthy();
    await manager.deleteFile('my-ws:foo.txt', remoteCallback);
    expect(
      await manager.readFile('my-ws:foo.txt', remoteCallback),
    ).toBeUndefined();

    await syncUntouchedEntries(
      controller.signal,
      manager,
      'my-ws',
      async () => {
        return RemoteFileEntry.newFile({
          file: createFileBlob('hello 2'),
          uid: 'my-ws:foo.txt',
          deleted: undefined,
        });
      },
    );

    const file = await manager.readFile('my-ws:foo.txt', async () => undefined);

    expect(file).toBeUndefined();
  });

  test('syncs unmodified files', async () => {
    const controller = new AbortController();
    const { manager } = createManager();

    let remoteCallback = async () =>
      RemoteFileEntry.newFile({
        file: createFileBlob('hello'),
        uid: 'my-ws:foo.txt',
        deleted: undefined,
      });
    // create a local entry for file foo
    await manager.readFile('my-ws:foo.txt', remoteCallback);

    let file = await manager.readFile('my-ws:foo.txt', remoteCallback);
    expect(await file?.text()).toEqual('hello');

    // update remote contents
    remoteCallback = async () => {
      return RemoteFileEntry.newFile({
        file: createFileBlob('hello 2'),
        uid: 'my-ws:foo.txt',
        deleted: undefined,
      });
    };

    // sync with remote entry returning different content
    // for file foo
    await syncUntouchedEntries(
      controller.signal,
      manager,
      'my-ws',
      remoteCallback,
    );

    file = await manager.readFile('my-ws:foo.txt', remoteCallback);
    expect(await file?.text()).toEqual('hello 2');
  });
});
