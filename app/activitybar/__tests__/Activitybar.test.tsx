/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';

import { changeSidebar, useUIManagerContext } from '@bangle.io/slice-ui';

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

// beforeEach(() => {

// });

test('renders when no sidebars', () => {
  let result = render(
    <div>
      <Activitybar operationKeybindings={{}} sidebars={[]}></Activitybar>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});

test('renders when there is sidebar', () => {
  let result = render(
    <div>
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
    </div>,
  );

  expect(result.container).toMatchSnapshot();
  expect(result.container.innerHTML).not.toContain('active');
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
    </div>,
  );

  expect(result.container).toMatchSnapshot();
  expect(result.container.innerHTML).toContain('active');
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
    </div>,
  );
  act(() => {
    fireEvent.click(result.getByRole('button', { name: 'search the notes' }));
  });

  expect(changeSidebarMock).toBeCalledTimes(1);
  expect(changeSidebarMock).nthCalledWith(1, 'sidebar::test-123');
});
