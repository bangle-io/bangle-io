import { mainInjectAbortableProxy } from '@bangle.io/abortable-worker';
import { searchPmNode } from '@bangle.io/search-pm-node';
import { createExtensionRegistry } from '@bangle.io/test-utils/extension-registry';
import { FileOps, fzfSearchNoteWsPaths } from '@bangle.io/workspaces';

import { abortableServices } from '../abortable-services';

jest.mock('@bangle.io/search-pm-node');
jest.mock('@bangle.io/workspaces', () => {
  return {
    FileOps: {
      listAllNotes: jest.fn(async () => []),
      getDoc: jest.fn(async () => {}),
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

let listAllNotesMock = FileOps.listAllNotes as jest.MockedFunction<
  typeof FileOps.listAllNotes
>;
let getDocMock = FileOps.getDoc as jest.MockedFunction<typeof FileOps.getDoc>;

beforeEach(() => {
  listAllNotesMock.mockImplementation(async () => []);
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
