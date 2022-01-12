import { mainInjectAbortableProxy } from '@bangle.io/abortable-worker';
import { searchPmNode } from '@bangle.io/search-pm-node';
import { createExtensionRegistry } from '@bangle.io/test-utils/extension-registry';
import { FileSystem, fzfSearchNoteWsPaths } from '@bangle.io/workspaces';

import { abortableServices } from '../abortable-services';

jest.mock('@bangle.io/search-pm-node');
jest.mock('@bangle.io/workspaces', () => {
  return {
    FileSystem: {
      listAllNotes: jest.fn(async () => []),
      listAllFiles: jest.fn(async () => []),
      getDoc: jest.fn(async () => {}),
      getFile: jest.fn(async () => {}),
    },
    fzfSearchNoteWsPaths: jest.fn(async () => {}),
  };
});

let setup = () => {
  let registry = createExtensionRegistry([], { editorCore: true });
  let services = mainInjectAbortableProxy(
    abortableServices({ extensionRegistry: registry }),
  );
  return { registry, services };
};

let listAllNotesMock = FileSystem.listAllNotes as jest.MockedFunction<
  typeof FileSystem.listAllNotes
>;
let listAllFilesMock = FileSystem.listAllFiles as jest.MockedFunction<
  typeof FileSystem.listAllFiles
>;
let getDocMock = FileSystem.getDoc as jest.MockedFunction<
  typeof FileSystem.getDoc
>;

let getFileMock = FileSystem.getFile as jest.MockedFunction<
  typeof FileSystem.getFile
>;

const textToFile = (str = 'hello world', fileName = 'foo.txt') => {
  var file = new File([str], fileName, { type: 'text/plain' });
  return file;
};

beforeEach(() => {
  listAllNotesMock.mockImplementation(async () => []);
  listAllFilesMock.mockImplementation(async () => []);
  getFileMock.mockImplementation(async () => textToFile());
  getDocMock.mockImplementation(async () => {
    return {} as any;
  });
});

describe('searchWsForPmNode', () => {
  test('works', async () => {
    listAllNotesMock.mockResolvedValue(['test-ws:my-file.md']);
    let { services } = setup();
    const controller = new AbortController();
    await services.abortableSearchWsForPmNode(
      controller.signal,
      'test-ws',
      'backlink:*',
      [],
      {},
    );

    expect(searchPmNode).toBeCalledTimes(1);
    expect(searchPmNode).nthCalledWith(
      1,
      expect.any(AbortSignal),
      'backlink:*',
      ['test-ws:my-file.md'],
      expect.any(Function),
      [],
      {},
    );
  });
});

describe('abortableFzfSearchNoteWsPaths', () => {
  test('works', async () => {
    listAllNotesMock.mockResolvedValue([
      'test-ws:my-file.md',
      'test-ws:rando.md',
    ]);
    let { services } = setup();
    const controller = new AbortController();
    await services.abortableFzfSearchNoteWsPaths(
      controller.signal,
      'test-ws',
      'my-file',
    );
    expect(fzfSearchNoteWsPaths).toBeCalledTimes(1);
    expect(fzfSearchNoteWsPaths).nthCalledWith(
      1,
      expect.any(AbortSignal),
      'test-ws',
      'my-file',
    );
  });
});

describe('abortableBackupAllFiles', () => {
  test('works', async () => {
    listAllNotesMock.mockResolvedValue([
      'test-ws:my-file.md',
      'test-ws:rando.md',
    ]);
    getFileMock.mockResolvedValue(textToFile('hi', 'file.md'));

    let { services } = setup();
    const controller = new AbortController();
    await services.abortableBackupAllFiles(controller.signal, 'test-ws');
  });
});
