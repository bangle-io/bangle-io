/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';

import { togglePaletteType, useUIManagerContext } from '@bangle.io/slice-ui';

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

beforeEach(() => {
  (useUIManagerContext as any).mockImplementation(() => {
    return {
      changelogHasUpdates: false,
      sidebar: undefined,
      dispatch: () => {},
      widescreen: false,
    };
  });
  togglePaletteTypeMock.mockImplementation(() => () => {});
});

test('renders mobile view', () => {
  let result = render(
    <div>
      <Activitybar operationKeybindings={{}} sidebars={[]}></Activitybar>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});

test('renders primaryWsPath', () => {
  let result = render(
    <div>
      <Activitybar
        operationKeybindings={{}}
        sidebars={[]}
        primaryWsPath={'my-thing:wow.md'}
      ></Activitybar>
    </div>,
  );

  expect(result.container.innerHTML).toContain('wow.md');
});

test('dispatches operation', () => {
  const dispatch = jest.fn();
  togglePaletteTypeMock.mockImplementation(() => dispatch);

  let result = render(
    <div>
      <Activitybar
        operationKeybindings={{}}
        sidebars={[]}
        primaryWsPath={'my-thing:wow.md'}
      />
    </div>,
  );
  act(() => {
    fireEvent.click(result.getByLabelText('See files palette'));
  });
  expect(dispatch).toBeCalledTimes(1);
});
