import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { useEditorManagerContext } from '@bangle.io/editor-manager-context';
import { naukarWorkerProxy } from '@bangle.io/naukar-proxy';
import {
  getUseEditorManagerContextReturn,
  getUseWorkspaceContextReturn,
} from '@bangle.io/test-utils/function-mock-return';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { BacklinkWidget } from '../BacklinkWidget';

jest.mock('@bangle.io/workspace-context');
jest.mock('@bangle.io/editor-manager-context');

jest.mock('@bangle.io/naukar-proxy', () => {
  return {
    naukarWorkerProxy: {
      abortableSearchWsForPmNode: jest.fn(),
    },
  };
});

let useWorkspaceContextMock = useWorkspaceContext as jest.MockedFunction<
  typeof useWorkspaceContext
>;

let useEditorManagerContextMock =
  useEditorManagerContext as jest.MockedFunction<
    typeof useEditorManagerContext
  >;

let abortableSearchWsForPmNodeMock =
  naukarWorkerProxy.abortableSearchWsForPmNode as jest.MockedFunction<
    typeof naukarWorkerProxy.abortableSearchWsForPmNode
  >;

beforeEach(() => {
  abortableSearchWsForPmNodeMock.mockImplementation(async () => []);

  useWorkspaceContextMock.mockImplementation(() => {
    return {
      ...getUseWorkspaceContextReturn,
      wsName: 'test-back-ws',
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

  const openedWsPaths = new OpenedWsPaths([
    'test-back-ws:my-linked-note-1.md',
    undefined,
  ]);

  const pushWsPath = jest.fn();

  useWorkspaceContextMock.mockImplementation(() => {
    return {
      ...getUseWorkspaceContextReturn,
      wsName: 'test-back-ws',
      openedWsPaths,
      pushWsPath,
    };
  });

  useEditorManagerContextMock.mockImplementation(() => {
    return {
      ...getUseEditorManagerContextReturn,
      focusedEditorId: 0,
    };
  });

  abortableSearchWsForPmNodeMock.mockImplementation(async () => {
    return [
      {
        matches: [
          {
            match: ['', '[[my-linked-note-1]]', ' some content'],
            parent: 'doc',
            parentPos: 2,
          },
        ],
        // reference to 'note-1' in 'note-2' note
        uid: 'test-back-ws:my-linked-note-2.md',
      },
    ];
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
