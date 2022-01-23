import { WorkspaceType } from '@bangle.io/constants';
import { pageSliceKey } from '@bangle.io/slice-page';
import {
  createNote,
  createWorkspace,
  getNote,
  goToWsNameRoute,
  listWorkspaces,
} from '@bangle.io/slice-workspace';
import { createPMNode } from '@bangle.io/test-utils/create-pm-node';
import * as idbHelpers from '@bangle.io/test-utils/indexedb-ws-helpers';
import { sleep } from '@bangle.io/utils';

import { setupMockWorkspaceWithNotes } from '..';
import { createBasicStore } from '../test-basic-store';

test('works', async () => {
  const { store } = createBasicStore();

  expect(pageSliceKey.getSliceState(store.state)).toMatchInlineSnapshot(`
    Object {
      "blockReload": false,
      "lifeCycleState": Object {
        "current": undefined,
        "previous": undefined,
      },
      "location": Object {
        "pathname": "",
        "search": "",
      },
      "pendingNavigation": undefined,
    }
  `);

  goToWsNameRoute('test-ws')(store.state, store.dispatch);

  await Promise.resolve();

  expect(pageSliceKey.getSliceState(store.state)?.location.pathname).toEqual(
    '/ws/test-ws',
  );

  // redirects to not found since we never created ws
  await sleep(0);

  expect(pageSliceKey.getSliceState(store.state)?.location.pathname).toEqual(
    '/ws-not-found/test-ws',
  );
});

test('creates workspace 1', async () => {
  await idbHelpers.setupMockWorkspace({ name: 'test-ws' });
  const { store } = createBasicStore();

  expect(
    (await listWorkspaces()(store.state, store.dispatch, store)).map(
      (r) => r.name,
    ),
  ).toEqual(['test-ws', 'bangle-help']);
});

test('creates workspace and notes 2', async () => {
  let { store } = createBasicStore();

  await createWorkspace('test-ws-1', WorkspaceType.browser)(
    store.state,
    store.dispatch,
    store,
  );

  expect(
    (await listWorkspaces()(store.state, store.dispatch, store)).map(
      (r) => r.name,
    ),
  ).toContain('test-ws-1');

  await createNote('test-ws-1:hello.md', {
    doc: createPMNode([], `# Hello World`.trim()),
  })(store.state, store.dispatch, store);

  await sleep(0);
  expect(
    (
      await getNote('test-ws-1:hello.md')(store.state, store.dispatch)
    )?.toJSON(),
  ).toEqual(createPMNode([], `# Hello World`.trim()).toJSON());

  store.destroy();

  await sleep(0);

  // information is persisted
  ({ store } = createBasicStore());

  expect(
    (await listWorkspaces()(store.state, store.dispatch, store)).map(
      (r) => r.name,
    ),
  ).toContain('test-ws-1');

  goToWsNameRoute('test-ws-1')(store.state, store.dispatch);
  await sleep(0);
  expect(
    (
      await getNote('test-ws-1:hello.md')(store.state, store.dispatch)
    )?.toJSON(),
  ).toEqual(createPMNode([], `# Hello World`.trim()).toJSON());
});

test('setupMockWorkspaceWithNotes', async () => {
  let { store } = createBasicStore();

  const { wsName, noteWsPaths } = await setupMockWorkspaceWithNotes(store);

  expect(
    (await listWorkspaces()(store.state, store.dispatch, store)).map(
      (r) => r.name,
    ),
  ).toContain(wsName);

  expect(
    (
      await getNote(noteWsPaths[0]![0])(store.state, store.dispatch)
    )?.toString(),
  ).toEqual('doc(heading("Hello World 0"))');
});
