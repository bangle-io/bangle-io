import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { wikiLink, wikiLinkMarkdownItPlugin } from '@bangle.dev/wiki-link';

import { useEditorManagerContext } from '@bangle.io/editor-manager-context';
import { Extension } from '@bangle.io/extension-registry';
import { createEditorFromMd } from '@bangle.io/test-utils/create-editor-view';
import {
  getUseEditorManagerContextReturn,
  getUseWorkspaceContextReturn,
} from '@bangle.io/test-utils/function-mock-return';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { BacklinkWidget } from '../BacklinkWidget';

jest.mock('@bangle.io/workspace-context');
jest.mock('@bangle.io/editor-manager-context');

let useWorkspaceContextMock = useWorkspaceContext as jest.MockedFunction<
  typeof useWorkspaceContext
>;

let useEditorManagerContextMock =
  useEditorManagerContext as jest.MockedFunction<
    typeof useEditorManagerContext
  >;

let dummyBacklinkExt = Extension.create({
  name: 'dummy-backlink',
  editor: {
    specs: [wikiLink.spec()],
    markdownItPlugins: [wikiLinkMarkdownItPlugin],
  },
});

beforeEach(() => {
  useWorkspaceContextMock.mockImplementation(() => {
    let editor = createEditorFromMd(
      `
  # hello 1
  
  para 1
  
  ## hello 2 
  
  para 2
      `,
      {
        extensions: [dummyBacklinkExt],
      },
    );
    return {
      ...getUseWorkspaceContextReturn,
      wsName: 'test-back-ws',
      noteWsPaths: [],
      getNote: jest.fn(async () => editor.view.state.doc),
    };
  });
  useEditorManagerContextMock.mockImplementation(() => {
    return {
      ...getUseEditorManagerContextReturn,
    };
  });
});

test('renders with blank data', async () => {
  const renderResult = render(
    <div>
      <BacklinkWidget />
    </div>,
  );

  expect(renderResult.container.innerHTML).toContain(`No backlinks found`);
  expect(renderResult.container).toMatchInlineSnapshot(`
    <div>
      <div>
        <div
          class="inline-backlink_widget-container flex flex-col"
        >
          <span
            class="font-light"
          >
            &lt;No backlinks found&gt;
          </span>
        </div>
      </div>
    </div>
  `);
});

test('renders backlinks', async () => {
  // We have opened note-1
  // which is referenced by note-2
  const noteWsPaths = [
    'test-back-ws:my-linked-note-2.md',
    'test-back-ws:my-linked-note-1.md',
  ];
  const openedWsPaths = new OpenedWsPaths([
    'test-back-ws:my-linked-note-1.md',
    undefined,
  ]);

  let editor2 = createEditorFromMd(
    `
# This is note 2

Hello here is a [[my-linked-note-1]]

`,
    {
      extensions: [dummyBacklinkExt],
    },
  );

  let editor1 = createEditorFromMd(
    `
# This is note 1
`,
    {
      extensions: [dummyBacklinkExt],
    },
  );

  const getNote = jest.fn(async (wsPath) => {
    if (wsPath.endsWith('-2.md')) {
      return editor2.view.state.doc;
    }
    if (wsPath.endsWith('-1.md')) {
      return editor1.view.state.doc;
    }
    throw new Error('Unknown wsPath sent ' + wsPath);
  });

  const pushWsPath = jest.fn();

  useWorkspaceContextMock.mockImplementation(() => {
    return {
      ...getUseWorkspaceContextReturn,
      wsName: 'test-back-ws',
      noteWsPaths,
      openedWsPaths,
      getNote,
      pushWsPath,
    };
  });

  useEditorManagerContextMock.mockImplementation(() => {
    return {
      ...getUseEditorManagerContextReturn,
      focusedEditorId: 0,
    };
  });

  const renderResult = render(
    <div>
      <BacklinkWidget />
    </div>,
  );

  let targetOption;
  await waitFor(() => {
    targetOption = renderResult.container.querySelector(
      '[data-id="test-back-ws:my-linked-note-2.md"]',
    );
    expect(targetOption).toBeTruthy();
  });

  expect(renderResult.container.innerHTML).toContain(`my-linked-note-2`);
  expect(renderResult.container).toMatchSnapshot();

  const backlinkedPage = renderResult.container.querySelector(
    '[data-id="test-back-ws:my-linked-note-2.md"]',
  );

  await fireEvent.click(backlinkedPage!);

  expect(pushWsPath).toBeCalledTimes(1);
  expect(pushWsPath).nthCalledWith(
    1,
    'test-back-ws:my-linked-note-2.md',
    false,
    false,
  );

  const expandButton = renderResult.container.querySelector(
    '[data-id="test-back-ws:my-linked-note-2.md"] button',
  );

  await fireEvent.click(expandButton!);

  expect(pushWsPath).toBeCalledTimes(1);

  expect(renderResult.container.innerHTML).toContain('Hello here is a ');
  expect(renderResult.container.innerHTML).toContain('[[my-linked-note-1]]');

  expect(
    renderResult.container.querySelector('.highlight-text-container'),
  ).toMatchSnapshot();

  await fireEvent.click(
    renderResult.container.querySelector('.highlight-text-container')!,
  );
  expect(pushWsPath).toBeCalledTimes(2);
  expect(pushWsPath).nthCalledWith(
    2,
    'test-back-ws:my-linked-note-2.md',
    false,
    false,
  );
});
