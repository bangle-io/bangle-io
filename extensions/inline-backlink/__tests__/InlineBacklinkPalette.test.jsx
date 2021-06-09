import React from 'react';
import { PluginKey } from '@bangle.dev/core/prosemirror/state';
import { Node } from '@bangle.dev/core/prosemirror/model';

import { render, act } from '@testing-library/react';
import { filterItems, InlineBacklinkPalette } from '../InlineBacklinkPalette';
import { useEditorViewContext } from '@bangle.dev/react';
import { coreSpec, corePlugins } from '@bangle.dev/core/utils/core-components';
import {
  useInlinePaletteItems,
  useInlinePaletteQuery,
  replaceSuggestionMarkWith,
} from 'inline-palette/index';
import { useWorkspacePath } from 'workspace/index';
import { sleep } from 'utils/utility';
import { BangleIOContext } from 'bangle-io-context/index';
import inlineBackLinkExtension from '../index';
import { useWorkspaceHooksContext } from 'workspace-hooks/index';

jest.mock('@bangle.dev/react', () => {
  return {
    useEditorViewContext: jest.fn(() => jest.fn()),
  };
});

jest.mock('inline-palette', () => {
  const otherThings = jest.requireActual('inline-palette');

  return {
    ...otherThings,
    useInlinePaletteItems: jest.fn(),
    useInlinePaletteQuery: jest.fn(),
    replaceSuggestionMarkWith: jest.fn(),
  };
});

jest.mock('workspace/index', () => {
  const workspaceThings = jest.requireActual('workspace/index');
  return {
    ...workspaceThings,
    useWorkspacePath: jest.fn(),
  };
});

jest.mock('workspace-hooks/index', () => {
  return {
    ...jest.requireActual('workspace-hooks/index'),
    useWorkspaceHooksContext: jest.fn(),
  };
});

const bangleIOContext = new BangleIOContext({
  coreRawSpecs: coreSpec(),
  getCorePlugins: corePlugins,
  extensions: [inlineBackLinkExtension],
});

const schema = bangleIOContext.specRegistry.schema;
const mockView = {
  state: {
    schema,
  },
};
let tooltipContentDOM, query;
beforeEach(async () => {
  tooltipContentDOM = document.createElement('div');
  query = '';
  replaceSuggestionMarkWith.mockImplementation(() => jest.fn());
  useEditorViewContext.mockImplementation(() => {
    return mockView;
  });
  useWorkspaceHooksContext.mockImplementation(() => ({ noteWsPaths: [] }));
  useInlinePaletteItems.mockImplementation(() => {
    return {
      getItemProps: jest.fn(),
    };
  });
  useInlinePaletteQuery.mockImplementation(() => ({
    tooltipContentDOM,
    query,
    counter: 0,
  }));
  useWorkspacePath.mockImplementation(() => ({ wsName: 'test-ws' }));
});

test('Initial render', async () => {
  useWorkspaceHooksContext.mockImplementation(() => ({
    noteWsPaths: ['test-ws:hello.md'],
  }));

  const result = render(<InlineBacklinkPalette />);

  expect(tooltipContentDOM).toMatchSnapshot();
});

test('Renders palette rows correctly', async () => {
  useWorkspaceHooksContext.mockImplementation(() => ({
    noteWsPaths: ['test-ws:my-file.md'],
  }));
  query = 'my';

  const result = render(<InlineBacklinkPalette />);

  let rows = Array.from(tooltipContentDOM.querySelectorAll('.palette-row'));

  expect(
    rows.find((node) => node.textContent.includes('my-file')),
  ).toBeTruthy();

  // doesnt show a row when query doesn't match
  query = 'no';
  result.rerender(<InlineBacklinkPalette />);
  rows = Array.from(tooltipContentDOM.querySelectorAll('.palette-row'));
  expect(rows.find((node) => node.textContent.includes('my-file'))).toBe(
    undefined,
  );
});

test('Handles malformed query', async () => {
  useWorkspaceHooksContext.mockImplementation(() => ({
    noteWsPaths: ['test-ws:my-file.md'],
  }));
  query = ']]';

  const result = render(<InlineBacklinkPalette />);
  const prom = sleep();
  await act(() => prom);
  expect(replaceSuggestionMarkWith).toBeCalledTimes(1);
  expect(replaceSuggestionMarkWith).nthCalledWith(1, expect.any(PluginKey), '');
});

test('Creates a backlink node when closed by typing ]]', async () => {
  useWorkspaceHooksContext.mockImplementation(() => ({
    noteWsPaths: ['test-ws:my-file.md'],
  }));
  // NOTE: its not [[better]], because [[ is part of the suggest query mark
  query = 'better]]';
  render(<InlineBacklinkPalette />);
  const prom = sleep();
  await act(() => prom);
  expect(replaceSuggestionMarkWith).toBeCalledTimes(1);
  expect(replaceSuggestionMarkWith).nthCalledWith(
    1,
    expect.any(PluginKey),
    expect.any(Node),
  );

  expect(replaceSuggestionMarkWith.mock.calls[0][1].attrs).toEqual({
    path: 'better',
    title: null,
  });
});

describe('filterItems', () => {
  test('shows create option', () => {
    const items = filterItems('test-ws', 'file', ['test-ws:my-file.md']);

    expect(items).toMatchInlineSnapshot(`
      Array [
        Object {
          "editorExecuteCommand": [Function],
          "title": "Create: file",
          "uid": "create-test-ws:file.md",
        },
        Object {
          "editorExecuteCommand": [Function],
          "title": "my-file",
          "uid": "test-ws:my-file.md",
          "wsPath": "test-ws:my-file.md",
        },
      ]
    `);
  });

  test('no create option when exact match', () => {
    const items = filterItems('test-ws', 'my-file', ['test-ws:my-file.md']);

    expect(items).toMatchInlineSnapshot(`
      Array [
        Object {
          "editorExecuteCommand": [Function],
          "title": "my-file",
          "uid": "test-ws:my-file.md",
          "wsPath": "test-ws:my-file.md",
        },
      ]
    `);
  });

  test('creating works', () => {
    const items = filterItems('test-ws', 'hello-world', ['test-ws:my-file.md']);

    expect(items.length).toBe(1);
    expect(items[0].title.includes('Create:')).toBe(true);
    const mockDispatch = jest.fn();
    items[0].editorExecuteCommand()(mockView.state, mockDispatch);
    expect(replaceSuggestionMarkWith).toBeCalledTimes(1);

    expect(replaceSuggestionMarkWith).nthCalledWith(
      1,
      expect.any(PluginKey),
      expect.any(Node),
    );

    expect(replaceSuggestionMarkWith.mock.calls[0][1].attrs).toEqual({
      path: 'hello-world',
      title: null,
    });
  });
});
