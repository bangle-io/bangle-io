/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { BangleApplicationStore } from '@bangle.io/shared-types';
import { changeSidebar, useUIManagerContext } from '@bangle.io/slice-ui';
import { createBasicTestStore, TestStoreProvider } from '@bangle.io/test-utils';

import { Activitybar } from '../Activitybar';

jest.mock('@bangle.io/slice-ui', () => {
  const otherThings = jest.requireActual('@bangle.io/slice-ui');

  return {
    ...otherThings,
    changeSidebar: jest.fn(() => () => {}),
    useUIManagerContext: jest.fn(() => ({})),
  };
});

let changeSidebarMock = changeSidebar as jest.MockedFunction<
  typeof changeSidebar
>;
let store: BangleApplicationStore;

(useUIManagerContext as any).mockImplementation(() => {
  return {
    changelogHasUpdates: false,
    sidebar: undefined,
    dispatch: () => {},
    widescreen: true,
  };
});

const changeSidebarRet = jest.fn();
changeSidebarMock.mockImplementation(() => changeSidebarRet);

beforeEach(() => {
  ({ store } = createBasicTestStore({
    extensions: [],
    useEditorCoreExtension: true,
    useEditorManagerSlice: true,
  }));
});

test('renders when no sidebars', () => {
  let result = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Activitybar operationKeybindings={{}} sidebars={[]}></Activitybar>
      </TestStoreProvider>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});

test('renders when there is sidebar', () => {
  let result = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Activitybar
          operationKeybindings={{}}
          sidebars={[
            {
              name: 'sidebar::test-123',
              title: 'search notes',
              activitybarIcon: <span>test-icon</span>,
              ReactComponent: () => null,
              hint: 'test-hint',
            },
          ]}
        ></Activitybar>
      </TestStoreProvider>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
  expect(result.container.innerHTML).not.toContain('BU_is-active');
});

test('renders when sidebar is active', () => {
  (useUIManagerContext as any).mockImplementation(() => {
    return {
      changelogHasUpdates: false,
      sidebar: 'sidebar::test-123',
      dispatch: () => {},
      widescreen: true,
    };
  });

  let result = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Activitybar
          operationKeybindings={{}}
          sidebars={[
            {
              name: 'sidebar::test-123',
              title: 'search notes',
              activitybarIcon: <span>test-icon</span>,
              ReactComponent: () => null,
              hint: 'test-hint',
            },
          ]}
        ></Activitybar>
      </TestStoreProvider>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
  expect(result.container.innerHTML).toContain('BU_is-active');
});

test('inactive sidebar is dispatched correctly', () => {
  let dispatch = jest.fn();
  (useUIManagerContext as any).mockImplementation(() => {
    return {
      changelogHasUpdates: false,
      sidebar: undefined,
      dispatch,
      widescreen: true,
    };
  });

  let result = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Activitybar
          operationKeybindings={{}}
          sidebars={[
            {
              name: 'sidebar::test-123',
              title: 'search notes',
              activitybarIcon: <span>test-icon</span>,
              ReactComponent: () => null,
              hint: 'test-hint',
            },
          ]}
        ></Activitybar>
      </TestStoreProvider>
    </div>,
  );
  act(() => {
    fireEvent.click(result.getByRole('button', { name: 'test-hint' }));
  });

  expect(changeSidebarMock).toBeCalledTimes(1);
  expect(changeSidebarMock).nthCalledWith(1, 'sidebar::test-123');
});

test('active sidebar is toggled off correctly', () => {
  let dispatch = jest.fn();
  (useUIManagerContext as any).mockImplementation(() => {
    return {
      changelogHasUpdates: false,
      sidebar: 'sidebar::test-123',
      dispatch,
      widescreen: true,
    };
  });

  let result = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Activitybar
          operationKeybindings={{}}
          sidebars={[
            {
              name: 'sidebar::test-123',
              title: 'search notes',
              activitybarIcon: <span>test-icon</span>,
              ReactComponent: () => null,
              hint: 'search the notes',
            },
          ]}
        ></Activitybar>
      </TestStoreProvider>
    </div>,
  );
  act(() => {
    fireEvent.click(result.getByRole('button', { name: 'search the notes' }));
  });

  expect(changeSidebarMock).toBeCalledTimes(1);
  expect(changeSidebarMock).nthCalledWith(1, 'sidebar::test-123');
});

test('activitybarIconShow is respected', async () => {
  let dispatch = jest.fn();
  (useUIManagerContext as any).mockImplementation(() => {
    return {
      changelogHasUpdates: false,
      sidebar: 'sidebar::test-123',
      dispatch,
      widescreen: true,
    };
  });

  let activitybarIconShow = jest.fn(() => false);

  let { rerender } = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Activitybar
          operationKeybindings={{}}
          sidebars={[
            {
              name: 'sidebar::test-123',
              title: 'search notes',
              activitybarIcon: <span>test-icon</span>,
              ReactComponent: () => null,
              hint: 'search the notes',
              activitybarIconShow,
            },
          ]}
        ></Activitybar>
      </TestStoreProvider>
    </div>,
  );

  expect(screen.queryAllByLabelText('search the notes')).toEqual([]);

  activitybarIconShow.mockImplementation(() => true);

  rerender(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Activitybar
          operationKeybindings={{}}
          sidebars={[
            {
              name: 'sidebar::test-123',
              title: 'search notes',
              activitybarIcon: <span>test-icon</span>,
              ReactComponent: () => null,
              hint: 'search the notes',
              activitybarIconShow,
            },
          ]}
        ></Activitybar>
      </TestStoreProvider>
    </div>,
  );

  expect(screen.queryAllByLabelText('search the notes')).toMatchInlineSnapshot(`
    [
      <button
        aria-label="search the notes"
        class="w-full py-3 rounded-sm flex justify-center B-activitybar_button BU_widescreen  B-ui-bangle-button_button p-1  transition-all duration-100 animate-on-press BU_is-active is-quiet "
        type="button"
      >
        <span
          class=" w-7 h-7 "
        >
          test-icon
        </span>
      </button>,
    ]
  `);
});
