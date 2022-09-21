/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, render } from '@testing-library/react';
import React from 'react';

import type { EditorView } from '@bangle.dev/pm';
import { Node, PluginKey } from '@bangle.dev/pm';
import { useEditorViewContext } from '@bangle.dev/react';

import {
  replaceSuggestionMarkWith,
  useInlinePaletteItems,
  useInlinePaletteQuery,
} from '@bangle.io/inline-palette';
import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import {
  createExtensionRegistry,
  getUseWorkspaceContextReturn,
} from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';

import { InlineBacklinkPalette } from '../editor/InlineBacklinkPalette';
import inlineBacklinkExtension from '../index';

jest.mock('@bangle.dev/react', () => {
  return {
    useEditorViewContext: jest.fn(() => jest.fn()),
  };
});

jest.mock('@bangle.io/inline-palette', () => {
  const otherThings = jest.requireActual('@bangle.io/inline-palette');

  return {
    ...otherThings,
    useInlinePaletteItems: jest.fn(),
    useInlinePaletteQuery: jest.fn(),
    replaceSuggestionMarkWith: jest.fn(),
  };
});

jest.mock('@bangle.io/slice-workspace', () => {
  return {
    ...jest.requireActual('@bangle.io/slice-workspace'),
    useWorkspaceContext: jest.fn(),
  };
});

const useInlinePaletteItemsMocked = jest.mocked(useInlinePaletteItems);
const useInlinePaletteQueryMocked = jest.mocked(useInlinePaletteQuery);
const replaceSuggestionMarkWithMocked = jest.mocked(replaceSuggestionMarkWith);
const useWorkspaceContextMocked = jest.mocked(useWorkspaceContext);
const useEditorViewContextMocked = jest.mocked(useEditorViewContext);

const extensionRegistry = createExtensionRegistry([inlineBacklinkExtension], {
  editorCore: true,
});

const schema = extensionRegistry.specRegistry.schema;
const mockView: EditorView = {
  state: {
    schema,
  },
} as any;

let tooltipContentDOM: HTMLDivElement, query: string;

beforeEach(async () => {
  tooltipContentDOM = document.createElement('div');
  query = '';
  replaceSuggestionMarkWithMocked.mockImplementation(() => jest.fn());
  useEditorViewContextMocked.mockImplementation(() => {
    return mockView;
  });
  useWorkspaceContextMocked.mockImplementation(() => ({
    ...getUseWorkspaceContextReturn,
    wsName: 'test-ws',
    noteWsPaths: [],
  }));
  useInlinePaletteItemsMocked.mockImplementation(() => {
    return {
      dismissPalette: jest.fn(),
      getItemProps: jest.fn(),
    };
  });
  useInlinePaletteQueryMocked.mockImplementation(() => ({
    tooltipContentDOM,
    query,
    counter: 0,
    isVisible: true,
  }));
});

test('Initial render', async () => {
  const noteWsPaths = ['test-ws:my-file.md'];

  useWorkspaceContextMocked.mockImplementation(() => ({
    ...getUseWorkspaceContextReturn,
    wsName: 'test-ws',
    noteWsPaths,
  }));

  const result = render(<InlineBacklinkPalette />);

  expect(tooltipContentDOM).toMatchSnapshot();
});

test('Hides when isVisible is false', async () => {
  useInlinePaletteQueryMocked.mockImplementation(() => ({
    tooltipContentDOM,
    query,
    counter: 0,
    isVisible: false,
  }));

  const noteWsPaths = ['test-ws:my-file.md'];

  useWorkspaceContextMocked.mockImplementation(() => ({
    ...getUseWorkspaceContextReturn,
    wsName: 'test-ws',
    noteWsPaths,
  }));

  const result = render(<InlineBacklinkPalette />);

  expect(tooltipContentDOM).toMatchSnapshot();
});

test('Renders palette rows correctly', async () => {
  const noteWsPaths = ['test-ws:my-file.md'];

  useWorkspaceContextMocked.mockImplementation(() => ({
    ...getUseWorkspaceContextReturn,
    wsName: 'test-ws',
    noteWsPaths,
  }));
  query = 'my';

  const result = render(<InlineBacklinkPalette />);

  let rows = Array.from(tooltipContentDOM.querySelectorAll('.palette-row'));

  expect(
    rows.find((node) => node?.textContent?.includes('my-file')),
  ).toBeTruthy();

  // doesnt show a row when query doesn't match
  query = 'no';
  result.rerender(<InlineBacklinkPalette />);
  rows = Array.from(tooltipContentDOM.querySelectorAll('.palette-row'));
  expect(rows.find((node) => node?.textContent?.includes('my-file'))).toBe(
    undefined,
  );
});

test('Renders filtering correct', async () => {
  const noteWsPaths = ['test-ws:my-file.md', 'test-ws:my-other-file.md'];

  useWorkspaceContextMocked.mockImplementation(() => ({
    ...getUseWorkspaceContextReturn,
    wsName: 'test-ws',
    noteWsPaths,
  }));
  query = 'my';

  const result = render(<InlineBacklinkPalette />);

  expect(
    Array.from(tooltipContentDOM.querySelectorAll('.palette-row')).map(
      (node) => node.textContent,
    ),
  ).toEqual(['my-file', 'Create: my', 'my-other-file']);

  query = 'other';
  result.rerender(<InlineBacklinkPalette />);
  expect(
    Array.from(tooltipContentDOM.querySelectorAll('.palette-row')).map(
      (node) => node.textContent,
    ),
  ).toEqual(['my-other-file', 'Create: other']);
});

test('If exact match does not show create', async () => {
  const noteWsPaths = ['test-ws:my-file.md', 'test-ws:my-other-file.md'];

  useWorkspaceContextMocked.mockImplementation(() => ({
    ...getUseWorkspaceContextReturn,
    wsName: 'test-ws',
    noteWsPaths,
  }));
  query = 'my-file';

  render(<InlineBacklinkPalette />);

  expect(
    Array.from(tooltipContentDOM.querySelectorAll('.palette-row')).map(
      (node) => node.textContent,
    ),
  ).toEqual(['my-file', 'my-other-file']);
});

test('Handles malformed query', async () => {
  const noteWsPaths = ['test-ws:my-file.md'];

  useWorkspaceContextMocked.mockImplementation(() => ({
    ...getUseWorkspaceContextReturn,
    wsName: 'test-ws',
    noteWsPaths,
  }));
  query = ']]';

  const result = render(<InlineBacklinkPalette />);
  const prom = sleep();
  await act(() => prom);
  expect(replaceSuggestionMarkWithMocked).toBeCalledTimes(1);
  expect(replaceSuggestionMarkWithMocked).nthCalledWith(
    1,
    expect.any(PluginKey),
    '',
  );
});

test('Creates a backlink node when closed by typing ]]', async () => {
  const noteWsPaths = ['test-ws:my-file.md'];
  useWorkspaceContextMocked.mockImplementation(() => ({
    ...getUseWorkspaceContextReturn,
    wsName: 'test-ws',
    noteWsPaths,
  }));
  // NOTE: its not [[better]], because [[ is part of the suggest query mark
  query = 'better]]';
  render(<InlineBacklinkPalette />);
  const prom = sleep();
  await act(() => prom);
  expect(replaceSuggestionMarkWithMocked).toBeCalledTimes(1);
  expect(replaceSuggestionMarkWithMocked).nthCalledWith(
    1,
    expect.any(PluginKey),
    expect.any(Node),
  );

  expect(
    (replaceSuggestionMarkWithMocked?.mock?.calls?.[0]?.[1] as any).attrs,
  ).toEqual({
    path: 'better',
    title: null,
  });
});
