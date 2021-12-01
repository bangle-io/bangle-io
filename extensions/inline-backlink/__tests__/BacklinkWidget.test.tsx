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
  const noteWsPaths = [
    'test-back-ws:other-note.md',
    'test-back-ws:my-backlinked-note.md',
  ];
  const openedWsPaths = new OpenedWsPaths([
    'test-back-ws:my-backlinked-note.md',
    undefined,
  ]);

  let editor = createEditorFromMd(
    `
# hello 1

Hello here is a [[my-backlinked-note]]

## hello 2 
`,
    {
      extensions: [dummyBacklinkExt],
    },
  );
  const getNote = jest.fn(async () => editor.view.state.doc);

  useWorkspaceContextMock.mockImplementation(() => {
    return {
      ...getUseWorkspaceContextReturn,
      wsName: 'test-back-ws',
      noteWsPaths,
      openedWsPaths,
      getNote,
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
      '[data-id="test-back-ws:my-backlinked-note.md"]',
    );
    expect(targetOption).toBeTruthy();
  });

  expect(renderResult.container.innerHTML).toContain(`my-backlinked-note`);
  expect(renderResult.container).toMatchSnapshot();
});
