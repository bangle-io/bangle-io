/**
 * @jest-environment jsdom
 */
import { mainInjectAbortableProxy } from '@bangle.io/abortable-worker';
import { searchPmNode } from '@bangle.io/search-pm-node';
import {
  createBasicTestStore,
  setupMockWorkspaceWithNotes,
} from '@bangle.io/test-utils';

import { abortableServices } from '../abortable-services';

jest.mock('@zip.js/zip.js/dist/zip-no-worker.min.js');

jest.mock('@bangle.io/search-pm-node', () => {
  const rest = Object.assign(
    {},
    jest.requireActual('@bangle.io/search-pm-node'),
  );
  const searchPmNode = jest.spyOn(rest, 'searchPmNode');

  return { ...rest, searchPmNode };
});

let setup = () => {
  const { store } = createBasicTestStore();

  let services = mainInjectAbortableProxy(
    abortableServices({
      storeRef: { current: store },
    }),
  );

  return { store, services };
};

const textToFile = (str = 'hello world', fileName = 'foo.txt') => {
  var file = new File([str], fileName, { type: 'text/plain' });
  return file;
};

describe('searchWsForPmNode', () => {
  test('works', async () => {
    let { services, store } = setup();

    await setupMockWorkspaceWithNotes(store, 'test-ws', [
      ['test-ws:my-file.md', `hello world\n wow magic link`],
    ]);

    const controller = new AbortController();
    const result = await services.abortableSearchWsForPmNode(
      controller.signal,
      'test-ws',
      'magic',
      [],
      {},
    );

    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "matches": Array [
            Object {
              "match": Array [
                "hello world
      wow ",
                "magic",
                " link",
              ],
              "parent": "paragraph",
              "parentPos": 0,
            },
          ],
          "uid": "test-ws:my-file.md",
        },
      ]
    `);

    expect(searchPmNode).toBeCalledTimes(1);
    expect(searchPmNode).nthCalledWith(
      1,
      expect.any(AbortSignal),
      'magic',
      ['test-ws:my-file.md'],
      expect.any(Function),
      [],
      {},
    );
  });
});

describe('abortableFzfSearchNoteWsPaths', () => {
  test('works', async () => {
    let { services, store } = setup();

    await setupMockWorkspaceWithNotes(store, 'test-ws', [
      ['test-ws:my-file.md', `hello world\n wow 1 `],
      ['test-ws:rando.md', `hello world\n wow 2 `],
    ]);

    const controller = new AbortController();
    const result = await services.abortableFzfSearchNoteWsPaths(
      controller.signal,
      'test-ws',
      'my-file',
    );
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "end": 7,
          "item": "test-ws:my-file.md",
          "positions": Set {
            6,
            5,
            4,
            3,
            2,
            1,
            0,
          },
          "score": 176,
          "start": 0,
        },
      ]
    `);
  });
});

describe('abortableBackupAllFiles', () => {
  test('works', async () => {
    let { services, store } = setup();

    await setupMockWorkspaceWithNotes(store, 'test-ws', [
      ['test-ws:my-file.md', `hello world\n wow 1 `],
      ['test-ws:rando.md', `hello world\n wow 2 `],
    ]);

    const controller = new AbortController();
    await services.abortableBackupAllFiles(controller.signal, 'test-ws');
  });
});
