/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';

import type { BangleApplicationStore } from '@bangle.io/api';
import {
  initialState,
  togglePaletteType,
  useUIManagerContext,
} from '@bangle.io/slice-ui';
import { createBasicTestStore, TestStoreProvider } from '@bangle.io/test-utils';

import { Activitybar } from '../Activitybar';

jest.mock('@bangle.io/slice-ui', () => {
  const otherThings = jest.requireActual('@bangle.io/slice-ui');

  return {
    ...otherThings,
    useUIManagerContext: jest.fn(() => ({})),
    togglePaletteType: jest.fn(() => () => {}),
  };
});

let togglePaletteTypeMock = togglePaletteType as jest.MockedFunction<
  typeof togglePaletteType
>;

let useUIManagerContextMock = jest.mocked(useUIManagerContext);
let store: BangleApplicationStore;

beforeEach(() => {
  ({ store } = createBasicTestStore({
    extensions: [],
    useEditorCoreExtension: true,
    useEditorManagerSlice: true,
  }));

  useUIManagerContextMock.mockImplementation(() => {
    return {
      ...initialState,
      changelogHasUpdates: false,
      sidebar: undefined,
      dispatch: () => {},
      widescreen: false,
      bangleStore: store,
    };
  });
  togglePaletteTypeMock.mockImplementation(() => () => {});
});

test('renders mobile view', () => {
  let result = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Activitybar operationKeybindings={{}} sidebars={[]}></Activitybar>
      </TestStoreProvider>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});

test('renders primaryWsPath', () => {
  let result = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Activitybar
          operationKeybindings={{}}
          sidebars={[]}
          primaryWsPath={'my-thing:wow.md'}
        ></Activitybar>
      </TestStoreProvider>
    </div>,
  );

  expect(result.container.innerHTML).toContain('wow.md');
});

test('dispatches operation', () => {
  const dispatch = jest.fn();
  togglePaletteTypeMock.mockImplementation(() => dispatch);

  let result = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Activitybar
          operationKeybindings={{}}
          sidebars={[]}
          primaryWsPath={'my-thing:wow.md'}
        />
      </TestStoreProvider>
    </div>,
  );
  act(() => {
    fireEvent.click(result.getByLabelText('See files palette'));
  });
  expect(dispatch).toBeCalledTimes(1);
});
