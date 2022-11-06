/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';

import { togglePaletteType } from '@bangle.io/slice-ui';
import {
  createBasicTestStore,
  setupMockWorkspaceWithNotes,
  TestStoreProvider,
} from '@bangle.io/test-utils';

import { ActivitybarMobile } from '../ActivitybarMobile';

jest.mock('@bangle.io/slice-ui', () => {
  const otherThings = jest.requireActual('@bangle.io/slice-ui');

  return {
    ...otherThings,
    togglePaletteType: jest.fn(() => jest.fn(() => {})),
  };
});

let togglePaletteTypeMock = togglePaletteType as jest.MockedFunction<
  typeof togglePaletteType
>;

test('renders mobile view', async () => {
  const { store } = createBasicTestStore({
    extensions: [],
    useEditorManagerSlice: true,
    useUISlice: true,
  });

  await setupMockWorkspaceWithNotes(store);

  let result = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <ActivitybarMobile></ActivitybarMobile>
      </TestStoreProvider>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});

test('renders primaryWsPath', async () => {
  const { store } = createBasicTestStore({
    extensions: [],
    useEditorManagerSlice: true,
    useUISlice: true,
  });

  await setupMockWorkspaceWithNotes(store, 'my-thing', [
    ['my-thing:wow1.md', 'wow1'],
    // last created file will be the primaryWsPath
    ['my-thing:wow2.md', 'wow2'],
  ]);

  let result = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <ActivitybarMobile />
      </TestStoreProvider>
    </div>,
  );

  expect(result.container.innerHTML).toContain('wow2');
});

test('dispatches operation', async () => {
  const { store } = createBasicTestStore({
    extensions: [],
    useEditorManagerSlice: true,
    useUISlice: true,
  });

  await setupMockWorkspaceWithNotes(store, 'my-thing', [
    ['my-thing:wow1.md', 'wow1'],
    // last created file will be the primaryWsPath
    ['my-thing:wow2.md', 'wow2'],
  ]);

  let result = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <ActivitybarMobile />
      </TestStoreProvider>
    </div>,
  );
  act(() => {
    fireEvent.click(result.getByLabelText('files palette'));
  });

  expect(togglePaletteTypeMock).toBeCalledTimes(1);
  expect(togglePaletteTypeMock).nthCalledWith(
    1,
    'bangle-io-core-palettes/notes',
  );
});
