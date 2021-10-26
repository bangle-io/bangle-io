import { defaultPlugins, defaultSpecs } from '@bangle.dev/all-base-components';
import { Node, PluginKey } from '@bangle.dev/pm';
import { useEditorViewContext } from '@bangle.dev/react';
import { act, render } from '@testing-library/react';
import { Extension, ExtensionRegistry } from 'extension-registry';
import {
  replaceSuggestionMarkWith,
  useInlinePaletteItems,
  useInlinePaletteQuery,
} from 'inline-palette';
import React from 'react';
import { sleep } from 'utils/utility';
import { useWorkspaceContext } from 'workspace-context';
import inlineBackLinkExtension from '../index';
import { InlineBacklinkPalette } from '../editor/InlineBacklinkPalette';

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

jest.mock('workspace-context/index', () => {
  return {
    ...jest.requireActual('workspace-context/index'),
    useWorkspaceContext: jest.fn(),
  };
});

const coreExtension = Extension.create({
  name: 'core',
  editor: {
    specs: defaultSpecs(),
    plugins: defaultPlugins(),
  },
});

const extensionRegistry = new ExtensionRegistry([
  coreExtension,
  inlineBackLinkExtension,
]);

const schema = extensionRegistry.specRegistry.schema;
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
  useWorkspaceContext.mockImplementation(() => ({
    wsName: 'test-ws',
    noteWsPaths: [],
  }));
  useInlinePaletteItems.mockImplementation(() => {
    return {
      getItemProps: jest.fn(),
    };
  });
  useInlinePaletteQuery.mockImplementation(() => ({
    tooltipContentDOM,
    query,
    counter: 0,
    isVisible: true,
  }));
});

test('Initial render', async () => {
  const noteWsPaths = ['test-ws:my-file.md'];

  useWorkspaceContext.mockImplementation(() => ({
    noteWsPaths,
  }));

  const result = render(<InlineBacklinkPalette />);

  expect(tooltipContentDOM).toMatchSnapshot();
});

test('Hides when isVisible is false', async () => {
  useInlinePaletteQuery.mockImplementation(() => ({
    tooltipContentDOM,
    query,
    counter: 0,
    isVisible: false,
  }));

  const noteWsPaths = ['test-ws:my-file.md'];

  useWorkspaceContext.mockImplementation(() => ({
    noteWsPaths,
  }));

  const result = render(<InlineBacklinkPalette />);

  expect(tooltipContentDOM).toMatchSnapshot();
});

test('Renders palette rows correctly', async () => {
  const noteWsPaths = ['test-ws:my-file.md'];

  useWorkspaceContext.mockImplementation(() => ({
    noteWsPaths,
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

test('Renders filtering correct', async () => {
  const noteWsPaths = ['test-ws:my-file.md', 'test-ws:my-other-file.md'];

  useWorkspaceContext.mockImplementation(() => ({
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

  useWorkspaceContext.mockImplementation(() => ({
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

  useWorkspaceContext.mockImplementation(() => ({
    noteWsPaths,
  }));
  query = ']]';

  const result = render(<InlineBacklinkPalette />);
  const prom = sleep();
  await act(() => prom);
  expect(replaceSuggestionMarkWith).toBeCalledTimes(1);
  expect(replaceSuggestionMarkWith).nthCalledWith(1, expect.any(PluginKey), '');
});

test('Creates a backlink node when closed by typing ]]', async () => {
  const noteWsPaths = ['test-ws:my-file.md'];
  useWorkspaceContext.mockImplementation(() => ({
    noteWsPaths,
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
