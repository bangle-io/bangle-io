/**
 * @jest-environment @bangle.io/jsdom-env
 */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';

import { notification } from '@bangle.io/api';
import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
  Severity,
} from '@bangle.io/constants';
import { Editor } from '@bangle.io/editor';
import { pushWsPath, workspaceSliceKey } from '@bangle.io/slice-workspace';
import {
  createBasicTestStore,
  setupMockWorkspaceWithNotes,
  TestStoreProvider,
  waitForExpect,
} from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';
import { resolvePath } from '@bangle.io/ws-path';

import inlineBackLinkExtension from '../index';

const setup = async ([firstNote, ...otherNotes]: Array<
  [string, string]
> = []) => {
  let {
    store,
    isEditorCollabReady,
    extensionRegistry,
    editorReadyActionsCount,
  } = createBasicTestStore({
    extensions: [inlineBackLinkExtension],
    useEditorManagerSlice: true,
  });
  const [wsPath, md] = firstNote || [];

  if (!wsPath || !md) {
    throw new Error('Invalid setup');
  }

  const { wsName } = resolvePath(wsPath);
  await setupMockWorkspaceWithNotes(store, wsName, [
    [wsPath, md],
    ...otherNotes,
  ]);

  let { container } = render(
    <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
      <Editor
        editorId={SECONDARY_EDITOR_INDEX}
        wsPath={wsPath}
        className="test-class"
        extensionRegistry={extensionRegistry}
      />
    </TestStoreProvider>,
  );

  await act(async () => {
    await waitForExpect(async () => {
      expect(editorReadyActionsCount()).toEqual(1);
    });
  });

  return {
    isEditorCollabReady,
    container,
    store,
    extensionRegistry,
  };
};

describe('BacklinkNode', () => {
  test('renders when no link found', async () => {
    const wsPath = 'test-ws:hi.md';
    await setup([[wsPath, `hello world`]]);

    await act(() => sleep(0));
    expect(
      screen.queryByTestId('inline-backlink-button'),
    ).toMatchInlineSnapshot(`null`);
  });

  test('renders correctly when match', async () => {
    const wsPath = 'test-ws:hi.md';
    await setup([[wsPath, `hello world [[hi]]`]]);

    await act(() => sleep(0));

    expect(await screen.findAllByTestId('inline-backlink-button'))
      .toMatchInlineSnapshot(`
      [
        <button
          aria-label="hi"
          class="B-inline-backlink_backlink "
          data-testid="inline-backlink-button"
          draggable="false"
        >
          <svg
            class="inline-block"
            stroke="currentColor"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10,5.5V1H3.5a.5.5,0,0,0-.5.5v15a.5.5,0,0,0,.5.5h11a.5.5,0,0,0,.5-.5V6H10.5A.5.5,0,0,1,10,5.5Z"
            />
            <path
              d="M11,1h.043a.5.5,0,0,1,.3535.1465l3.457,3.457A.5.5,0,0,1,15,4.957V5H11Z"
            />
          </svg>
          <span
            class="inline"
          >
            hi
          </span>
        </button>,
      ]
    `);
  });

  test('renders title if it exists', async () => {
    const wsPath = 'test-ws:my/note-path.md';
    await setup([[wsPath, `hello world [[my/note-path|monako]]`]]);

    await act(() => sleep(10));

    expect(await screen.findAllByTestId('inline-backlink-button'))
      .toMatchInlineSnapshot(`
      [
        <button
          aria-label="monako"
          class="B-inline-backlink_backlink "
          data-testid="inline-backlink-button"
          draggable="false"
        >
          <svg
            class="inline-block"
            stroke="currentColor"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10,5.5V1H3.5a.5.5,0,0,0-.5.5v15a.5.5,0,0,0,.5.5h11a.5.5,0,0,0,.5-.5V6H10.5A.5.5,0,0,1,10,5.5Z"
            />
            <path
              d="M11,1h.043a.5.5,0,0,1,.3535.1465l3.457,3.457A.5.5,0,0,1,15,4.957V5H11Z"
            />
          </svg>
          <span
            class="inline"
          >
            monako
          </span>
        </button>,
      ]
    `);
  });

  test('styles not found notes differently', async () => {
    const wsPath = 'test-ws:tea.md';
    const { container } = await setup([[wsPath, `hello world [[bubble]]`]]);

    await act(() => sleep(0));

    expect(container.innerHTML).toContain('B-inline-backlink_backlinkNotFound');
  });
});

describe('clicking node', () => {
  const clickSetup = async (
    element: Element,
    clickOpts?: Parameters<typeof fireEvent.click>[1],
  ) => {
    const prom = sleep();
    fireEvent.click(element, clickOpts);

    // wait for the promise in click to resolve
    await act(() => prom);
  };

  test('clicks correctly when there is a match', async () => {
    const wsPath = 'test-ws:hello-world.md';
    const { store, container } = await setup([
      [wsPath, `hello world [[monako]]`],
      ['test-ws:monako.md', 'monako content'],
    ]);
    pushWsPath(wsPath)(store.state, store.dispatch);

    await act(() => sleep(0));

    await waitFor(() => {
      expect(container.innerHTML).toContain('monako');
    });

    // make sure current path is hello-world.md
    expect(
      workspaceSliceKey
        .getSliceState(store.state)
        ?.openedWsPaths.getByIndex(PRIMARY_EDITOR_INDEX),
    ).toEqual(wsPath);

    await clickSetup(screen.getByText(/monako/i));
    await act(() => sleep(0));

    expect(
      workspaceSliceKey
        .getSliceState(store.state)
        ?.openedWsPaths.getByIndex(PRIMARY_EDITOR_INDEX),
    ).toEqual('test-ws:monako.md');
  });

  test('picks the least nested when there are two matches', async () => {
    const wsPath = 'test-ws:hello-world.md';
    const { store, container } = await setup([
      [wsPath, `hello world [[note1]]`],
      ['test-ws:magic/note1.md', 'some content'],
      ['test-ws:magic/some/note1.md', 'some other content'],
    ]);
    pushWsPath(wsPath)(store.state, store.dispatch);
    await act(() => sleep(0));

    await waitFor(() => {
      expect(container.innerHTML).toContain('note1');
    });

    await clickSetup(screen.getByText(/note1/i));
    await act(() => sleep(0));

    expect(
      workspaceSliceKey
        .getSliceState(store.state)
        ?.openedWsPaths.getByIndex(PRIMARY_EDITOR_INDEX),
    ).toEqual('test-ws:magic/note1.md');
  });

  test('works if there is a matching extension', async () => {
    const wsPath = 'test-ws:hello-world.md';
    const { store, container } = await setup([
      [wsPath, `hello world [[note1.md]]`],
      ['test-ws:magic/note1.md', 'some content'],
      ['test-ws:magic/some/note1.md', 'some other content'],
    ]);
    pushWsPath(wsPath)(store.state, store.dispatch);
    await act(() => sleep(0));
    await waitFor(() => {
      expect(container.innerHTML).toContain('note1');
    });
    await clickSetup(screen.getByText(/note1/i));
    await act(() => sleep(0));

    expect(
      workspaceSliceKey
        .getSliceState(store.state)
        ?.openedWsPaths.getByIndex(PRIMARY_EDITOR_INDEX),
    ).toEqual('test-ws:magic/note1.md');
  });

  test('does not work if not a matching extension', async () => {
    const wsPath = 'test-ws:hello-world.md';
    const { store, container } = await setup([
      [wsPath, `hello world [[note1.txt]]`],
      ['test-ws:magic/note1.md', 'some content'],
      ['test-ws:magic/some/note1.md', 'some other content'],
    ]);
    pushWsPath(wsPath)(store.state, store.dispatch);
    await act(() => sleep(0));

    await waitFor(() => {
      expect(container.innerHTML).toContain('note1');
    });

    await clickSetup(screen.getByText(/note1/i));
    await act(() => sleep(0));

    expect(
      workspaceSliceKey
        .getSliceState(store.state)
        ?.openedWsPaths.getByIndex(PRIMARY_EDITOR_INDEX),
    ).toEqual(wsPath);

    expect(
      notification.notificationSliceKey.getSliceState(store.state)
        ?.notifications[0],
    ).toMatchObject({
      content: 'Bangle.io support the following file extensions for notes: .md',
      severity: Severity.ERROR,
      title: 'Invalid backlink path',
      uid: expect.any(String),
    });
  });

  test('fall backs to  case insensitive if no case sensitive match', async () => {
    const wsPath = 'test-ws:hello-world.md';
    const { store, container } = await setup([
      [wsPath, `hello world [[Note1]]`],
      ['test-ws:magic/note1.md', 'some content'],
    ]);
    pushWsPath(wsPath)(store.state, store.dispatch);

    await act(() => sleep(0));
    await waitFor(() => {
      expect(container.innerHTML).toContain('Note1');
    });
    await clickSetup(screen.getByText(/Note1/i));
    await act(() => sleep(0));

    expect(
      workspaceSliceKey
        .getSliceState(store.state)
        ?.openedWsPaths.getByIndex(PRIMARY_EDITOR_INDEX),
    ).toEqual('test-ws:magic/note1.md');
  });

  test('Gets the exact match if it exists', async () => {
    const wsPath = 'test-ws:hello-world.md';
    const { container, store } = await setup([
      [wsPath, `hello world [[NoTe1]]`],
      ['test-ws:magic/NoTe1.md', 'content a'],
      ['test-ws:note1.md', 'content b'],
    ]);
    pushWsPath(wsPath)(store.state, store.dispatch);

    await act(() => sleep(0));
    await waitFor(() => {
      expect(container.innerHTML).toContain('NoTe1');
    });
    await clickSetup(screen.getByText(/NoTe1/i));
    await act(() => sleep(0));

    expect(
      workspaceSliceKey
        .getSliceState(store.state)
        ?.openedWsPaths.getByIndex(PRIMARY_EDITOR_INDEX),
    ).toEqual('test-ws:magic/NoTe1.md');
  });

  test("doesn't confuse if match ends with same", async () => {
    const wsPath = 'test-ws:hello-world.md';
    const { container, store } = await setup([
      [wsPath, `hello world [[note1]]`],
      ['test-ws:magic/some-place/hotel/something-note1.md', 'content a'],
      ['test-ws:magic/some-other/place/dig/some-else-note1.md', 'content b'],
    ]);

    pushWsPath(wsPath)(store.state, store.dispatch);

    await act(() => sleep(0));
    await waitFor(() => {
      expect(container.innerHTML).toContain('note1');
    });

    await clickSetup(screen.getByText(/note1/i));
    await act(() => sleep(0));

    expect(
      workspaceSliceKey
        .getSliceState(store.state)
        ?.openedWsPaths.getByIndex(PRIMARY_EDITOR_INDEX),
    ).toEqual('test-ws:note1.md');
  });

  test('doesnt confuse if a subdirectory path match partially matches 2', async () => {
    const wsPath = 'test-ws:hello-world.md';
    const { store } = await setup([
      [wsPath, `hello world [[tel/note1]]`],
      ['test-ws:magic/some-place/hotel/note1.md', 'content a'],
      ['test-ws:magic/tel/note1.md', 'content b'],
    ]);

    pushWsPath(wsPath)(store.state, store.dispatch);
    await waitForExpect(() => {
      expect(
        workspaceSliceKey.getSliceState(store.state)?.openedWsPaths
          .primaryWsPath,
      ).toEqual(wsPath);
    });

    await act(() => sleep(0));
    await clickSetup(screen.getByText(/note1/i));
    await act(() => sleep(0));

    await waitForExpect(() => {
      expect(
        workspaceSliceKey
          .getSliceState(store.state)
          ?.openedWsPaths.getByIndex(PRIMARY_EDITOR_INDEX),
      ).toEqual('test-ws:tel/note1.md');
    });
  });

  test('opens sidebar on shift click', async () => {
    const wsPath = 'test-ws:hello-world.md';
    const { store } = await setup([
      [wsPath, `hello world [[note1]]`],
      ['test-ws:note1.md', 'content b'],
    ]);
    pushWsPath(wsPath)(store.state, store.dispatch);

    await waitForExpect(() =>
      expect(
        workspaceSliceKey.getSliceState(store.state)?.openedWsPaths
          .primaryWsPath,
      ).toEqual(wsPath),
    );

    await act(() => sleep(0));
    await clickSetup(screen.getByText(/note1/i), { shiftKey: true });
    await act(() => sleep(0));

    await waitForExpect(() =>
      expect(
        workspaceSliceKey
          .getSliceState(store.state)
          ?.openedWsPaths.getByIndex(PRIMARY_EDITOR_INDEX),
      ).toEqual(wsPath),
    );

    expect(
      workspaceSliceKey
        .getSliceState(store.state)
        ?.openedWsPaths.getByIndex(SECONDARY_EDITOR_INDEX),
    ).toEqual('test-ws:note1.md');
  });

  test('matches if relative path 1', async () => {
    const wsPath = 'test-ws:magic/hello/beautiful/world.md';
    const { store } = await setup([
      [wsPath, `hello world [[../note2]]`],
      ['test-ws:magic/some-place/hotel/note1.md', 'content'],
      ['test-ws:magic/some/note2.md', 'content'],
      ['test-ws:magic/note2.md', 'content'],
    ]);

    pushWsPath(wsPath)(store.state, store.dispatch);

    await act(() => sleep(0));
    await clickSetup(screen.getByText(/note2/i));
    await act(() => sleep(0));

    expect(
      workspaceSliceKey
        .getSliceState(store.state)
        ?.openedWsPaths.getByIndex(PRIMARY_EDITOR_INDEX),
    ).toEqual('test-ws:magic/hello/note2.md');
  });

  test('matches if relative path 2', async () => {
    const wsPath = 'test-ws:magic/hello/beautiful/world.md';
    const { store } = await setup([
      [wsPath, `hello world [[../../note2]]`],
      ['test-ws:magic/some-place/hotel/note1.md', 'content'],
      ['test-ws:magic/some/note2.md', 'content'],
      ['test-ws:magic/note2.md', 'content'],
    ]);

    pushWsPath(wsPath)(store.state, store.dispatch);

    await act(() => sleep(5));
    await clickSetup(screen.getByText(/note2/i));
    await act(() => sleep(0));

    await waitForExpect(() => {
      expect(
        workspaceSliceKey
          .getSliceState(store.state)
          ?.openedWsPaths.getByIndex(PRIMARY_EDITOR_INDEX),
      ).toEqual('test-ws:magic/note2.md');
    });
  });

  test('matches if relative path 3', async () => {
    const wsPath = 'test-ws:magic/hello/beautiful/world.md';
    const { store } = await setup([
      [wsPath, `hello world [[../../../note2]]`],
      ['test-ws:magic/some-place/hotel/note1.md', 'content'],
      ['test-ws:magic/some/note2.md', 'content'],
      ['test-ws:magic/note2.md', 'content'],
    ]);

    pushWsPath(wsPath)(store.state, store.dispatch);

    await act(() => sleep(0));
    await clickSetup(screen.getByText(/note2/i));
    await act(() => sleep(0));

    expect(
      workspaceSliceKey
        .getSliceState(store.state)
        ?.openedWsPaths.getByIndex(PRIMARY_EDITOR_INDEX),
    ).toEqual('test-ws:note2.md');
  });

  test('if relative is outside', async () => {
    const wsPath = 'test-ws:magic/hello/beautiful/world.md';
    const { store } = await setup([
      [wsPath, `hello world [[../../../../note2]]`],
      ['test-ws:magic/some-place/hotel/note1.md', 'content'],
      ['test-ws:magic/some/note2.md', 'content'],
      ['test-ws:magic/note2.md', 'content'],
    ]);

    pushWsPath(wsPath)(store.state, store.dispatch);

    await act(() => sleep(0));
    await clickSetup(screen.getByText(/note2/i));
    await act(() => sleep(0));

    expect(
      workspaceSliceKey
        .getSliceState(store.state)
        ?.openedWsPaths.getByIndex(PRIMARY_EDITOR_INDEX),
    ).toEqual('test-ws:note2.md');
  });

  test('if path starts with /', async () => {
    const wsPath = 'test-ws:magic/hello/beautiful/world.md';
    const { store } = await setup([
      [wsPath, `hello world [[/note2]]`],
      ['test-ws:magic/some-place/hotel/note1.md', 'content'],
      ['test-ws:magic/some/note2.md', 'content'],
      ['test-ws:magic/note2.md', 'content'],
    ]);

    pushWsPath(wsPath)(store.state, store.dispatch);

    await act(() => sleep(0));
    await clickSetup(screen.getByText(/note2/i));
    await act(() => sleep(0));

    expect(
      workspaceSliceKey
        .getSliceState(store.state)
        ?.openedWsPaths.getByIndex(PRIMARY_EDITOR_INDEX),
    ).toEqual('test-ws:note2.md');
  });

  test('if path starts with / and has directory', async () => {
    const wsPath = 'test-ws:magic/hello/beautiful/world.md';
    const { store } = await setup([
      [wsPath, `hello world [[/magic/some/note2]]`],
      ['test-ws:magic/some-place/hotel/note1.md', 'content'],
      ['test-ws:magic/some/note2.md', 'content'],
      ['test-ws:magic/note2.md', 'content'],
    ]);

    pushWsPath(wsPath)(store.state, store.dispatch);

    await act(() => sleep(0));
    await clickSetup(screen.getByText(/note2/i));
    await act(() => sleep(0));

    await waitForExpect(() => {
      expect(
        workspaceSliceKey
          .getSliceState(store.state)
          ?.openedWsPaths.getByIndex(PRIMARY_EDITOR_INDEX),
      ).toEqual('test-ws:magic/some/note2.md');
    });
  });
});
