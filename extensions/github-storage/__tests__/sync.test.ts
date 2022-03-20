import {
  LocalFileEntryManager,
  RemoteFileEntry,
} from '@bangle.io/remote-file-sync';

import { getFileBlob, getTree } from '../github-api-helpers';
import { GithubWsMetadata } from '../helpers';
import { syncUntouchedEntries } from '../sync';

jest.mock('../github-api-helpers', () => {
  return {
    getTree: jest.fn(),
    getFileBlob: jest.fn(),
  };
});

const getTreeMock = jest.mocked(getTree);
const getFileBlobMock = jest.mocked(getFileBlob);

export const createFileBlob = (fileText: string): File =>
  new Blob([fileText], { type: 'text/plain' }) as any;

beforeEach(() => {
  getTreeMock.mockResolvedValue({
    sha: 'sdasdsa',
    tree: [],
  });

  getFileBlobMock.mockResolvedValue(createFileBlob('hello'));
});

const createManager = () => {
  const store = new Map<string, any>();
  const manager = new LocalFileEntryManager({
    get: (key: string) => Promise.resolve(store.get(key)),
    set: (key: string, obj: any) => {
      store.set(key, obj);

      return Promise.resolve();
    },
    getValues: async () => Promise.resolve(Array.from(store.values())),
    delete: (key: string) => {
      store.delete(key);

      return Promise.resolve();
    },
  });

  return { manager, store };
};

let wsMetadata: GithubWsMetadata = {
  owner: 'test',
  branch: 'test',
  githubToken: 'test',
};

describe('syncUntouchedEntries', () => {
  test('blank test case', async () => {
    const controller = new AbortController();
    const { manager } = createManager();
    await syncUntouchedEntries(controller.signal, manager, 'my-ws', wsMetadata);
  });

  test('does not sync newly created files', async () => {
    const controller = new AbortController();
    const { manager } = createManager();
    await manager.createFile(
      'my-ws:foo.txt',
      createFileBlob('hello'),
      async () => undefined,
    );

    await syncUntouchedEntries(controller.signal, manager, 'my-ws', wsMetadata);

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

    await syncUntouchedEntries(controller.signal, manager, 'my-ws', wsMetadata);

    const file = await manager.readFile('my-ws:foo.txt', async () => undefined);

    expect(file).toBeUndefined();
  });

  test('removes files that were deleted on github', async () => {
    const controller = new AbortController();
    const { manager } = createManager();

    let remoteCallback1 = async (): Promise<RemoteFileEntry | undefined> =>
      RemoteFileEntry.newFile({
        file: createFileBlob('hello'),
        uid: 'my-ws:foo.txt',
        deleted: undefined,
      });
    // create a local entry for file foo
    await manager.readFile('my-ws:foo.txt', remoteCallback1);

    // delete the file on github
    let remoteCallback2 = jest.fn(async () => undefined);
    expect(
      await manager.readFile('my-ws:foo.txt', remoteCallback2),
    ).toBeTruthy();

    // since a local entry exists, remoteCallback2 should not be called
    expect(remoteCallback2).toHaveBeenCalledTimes(0);

    // syncing should delete the entry
    await syncUntouchedEntries(controller.signal, manager, 'my-ws', wsMetadata);

    expect(
      await manager.readFile('my-ws:foo.txt', remoteCallback2),
    ).toBeUndefined();

    // since a local entry exists, remoteCallback2 should not be called
    expect(remoteCallback2).toHaveBeenCalledTimes(1);
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

    const updatedRemoteFile = createFileBlob('hello 2');
    // update remote contents
    let remoteCallback2 = jest.fn(async () => {
      return RemoteFileEntry.newFile({
        file: updatedRemoteFile,
        uid: 'my-ws:foo.txt',
        deleted: undefined,
      });
    });

    getTreeMock.mockResolvedValue({
      sha: '121dsa',
      tree: [
        {
          url: 'https://github.com/blob/foo.txt',
          wsPath: 'my-ws:foo.txt',
        },
      ],
    });
    getFileBlobMock.mockResolvedValue(updatedRemoteFile);

    // sync with remote entry returning different content
    // for file foo
    await syncUntouchedEntries(controller.signal, manager, 'my-ws', wsMetadata);
    expect(getFileBlobMock).toHaveBeenCalledTimes(1);
    expect(getFileBlobMock).nthCalledWith(1, {
      fileBlobUrl: 'https://github.com/blob/foo.txt',
      config: { ...wsMetadata, repoName: 'my-ws' },
      fileName: 'foo.txt',
      abortSignal: controller.signal,
    });

    file = await manager.readFile('my-ws:foo.txt', remoteCallback2);
    expect(await file?.text()).toEqual('hello 2');

    // should not call remote since entry was updated by `syncUntouchedEntries`
    expect(remoteCallback2).toHaveBeenCalledTimes(0);
  });
});
