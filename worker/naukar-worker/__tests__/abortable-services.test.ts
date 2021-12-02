import { mainInjectAbortableProxy } from '@bangle.io/abortable-worker';
import { searchPmNode } from '@bangle.io/search-pm-node';
import { createExtensionRegistry } from '@bangle.io/test-utils/extension-registry';
import { FileOps } from '@bangle.io/workspaces';

import { abortableServices } from '../abortable-services';

jest.mock('@bangle.io/search-pm-node');
jest.mock('@bangle.io/workspaces', () => {
  const other = jest.requireActual('@bangle.io/workspaces');

  return {
    ...other,
    FileOps: {},
  };
});

let setup = () => {
  let registry = createExtensionRegistry([], { editorCore: true });
  let services = mainInjectAbortableProxy(
    abortableServices({ extensionRegistry: registry }),
  );
  return { registry, services };
};

describe('searchWsForPmNode', () => {
  let { services } = setup();
  FileOps.getDoc = jest.fn();
  FileOps.listAllFiles = jest.fn(async () => ['test-ws:my-file.md']);

  test('works', async () => {
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
