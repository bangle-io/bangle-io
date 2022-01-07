import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';

import { toggleNotesPalette } from '@bangle.io/core-operations';
import { useUIManagerContext } from '@bangle.io/ui-context';

import { Activitybar } from '../Activitybar';

jest.mock('@bangle.io/ui-context', () => {
  const otherThings = jest.requireActual('@bangle.io/ui-context');
  return {
    ...otherThings,
    useUIManagerContext: jest.fn(() => ({})),
  };
});

jest.mock('@bangle.io/core-operations', () => {
  const operations = jest.requireActual('@bangle.io/core-operations');

  return {
    ...operations,
    toggleNotesPalette: jest.fn(() => () => {}),
  };
});

let toggleNotesPaletteMock = toggleNotesPalette as jest.MockedFunction<
  typeof toggleNotesPalette
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
  toggleNotesPaletteMock.mockImplementation(() => () => {});
});

test('renders mobile view', () => {
  let result = render(
    <div>
      <Activitybar actionKeybindings={{}} sidebars={[]}></Activitybar>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});

test('renders primaryWsPath', () => {
  let result = render(
    <div>
      <Activitybar
        actionKeybindings={{}}
        sidebars={[]}
        primaryWsPath={'my-thing:wow.md'}
      ></Activitybar>
    </div>,
  );

  expect(result.container.innerHTML).toContain('wow.md');
});

test('dispatches action', () => {
  const dispatch = jest.fn();
  toggleNotesPaletteMock.mockImplementation(() => dispatch);

  let result = render(
    <div>
      <Activitybar
        actionKeybindings={{}}
        sidebars={[]}
        primaryWsPath={'my-thing:wow.md'}
      />
    </div>,
  );
  act(() => {
    fireEvent.click(result.getByRole('button'));
  });
  expect(dispatch).toBeCalledTimes(1);
});
