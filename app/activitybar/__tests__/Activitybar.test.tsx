import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';

import { useUIManagerContext } from '@bangle.io/ui-context';

import { Activitybar } from '../Activitybar';

jest.mock('@bangle.io/ui-context', () => {
  const otherThings = jest.requireActual('@bangle.io/ui-context');
  return {
    ...otherThings,
    useUIManagerContext: jest.fn(() => ({})),
  };
});

beforeEach(() => {
  (useUIManagerContext as any).mockImplementation(() => {
    return {
      changelogHasUpdates: false,
      sidebar: undefined,
      dispatch: () => {},
      widescreen: true,
    };
  });
});

test('renders when no sidebars', () => {
  let result = render(
    <div>
      <Activitybar actionKeybindings={{}} sidebars={[]}></Activitybar>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});

test('renders when there is sidebar', () => {
  let result = render(
    <div>
      <Activitybar
        actionKeybindings={{}}
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
        actionKeybindings={{}}
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
        actionKeybindings={{}}
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

  expect(dispatch).toBeCalledTimes(1);
  expect(dispatch).nthCalledWith(1, {
    name: 'UI/CHANGE_SIDEBAR',
    value: {
      type: 'sidebar::test-123',
    },
  });
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
        actionKeybindings={{}}
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

  expect(dispatch).toBeCalledTimes(1);
  expect(dispatch).nthCalledWith(1, {
    name: 'UI/TOGGLE_SIDEBAR',
    value: {
      type: 'sidebar::test-123',
    },
  });
});
