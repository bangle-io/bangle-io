/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE } from '@bangle.io/constants';
import { newNote } from '@bangle.io/shared-operations';

import { ActivitybarOptionsDropdown } from '../ActivitybarOptionsDropdown';

jest.mock('@bangle.io/shared-operations', () => {
  const operations = jest.requireActual('@bangle.io/shared-operations');

  return {
    ...operations,
    newNote: jest.fn(() => () => {}),
  };
});
jest.mock('react-dom', () => {
  const otherThings = jest.requireActual('react-dom');

  return {
    ...otherThings,
    createPortal: jest.fn((element, node) => {
      return element;
    }),
  };
});

const operationKeybindings = {
  [CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE]: 'Ctrl-P',
};

let newNoteMock = newNote as jest.MockedFunction<typeof newNote>;

beforeEach(() => {
  newNoteMock.mockImplementation(() => () => {});
});

test('renders correctly', () => {
  let result = render(
    <div>
      <ActivitybarOptionsDropdown
        operationKeybindings={operationKeybindings}
        widescreen={true}
      />
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});

test('clicking the button shows dropdown', async () => {
  let result = render(
    <div>
      <ActivitybarOptionsDropdown
        operationKeybindings={operationKeybindings}
        widescreen={true}
      />
    </div>,
  );

  act(() => {
    fireEvent.click(result.getByLabelText('options menu'));
  });

  let targetOption: ReturnType<typeof result.getByLabelText> | undefined;
  await waitFor(() => {
    targetOption = result.getByLabelText('options dropdown');
    expect(targetOption).toBeTruthy();
  });

  // check if keyboard shortcut is shown
  // note: kbd utility prettifies 'Ctrl-P' to 'Ctrl-⇧'
  expect(
    [...(targetOption?.querySelectorAll('li[data-key]') || [])].find((t) =>
      t.innerHTML.includes('⇧'),
    ),
  ).toBeTruthy();

  expect(targetOption).toMatchSnapshot();
});

test('clicking items in dropdown dispatches event', async () => {
  const dispatch = jest.fn();

  newNoteMock.mockImplementation(() => dispatch);

  let result = render(
    <div>
      <ActivitybarOptionsDropdown
        operationKeybindings={operationKeybindings}
        widescreen={true}
      ></ActivitybarOptionsDropdown>
    </div>,
  );

  act(() => {
    fireEvent.click(result.getByLabelText('options menu'));
  });

  let targetOption;

  await waitFor(() => {
    targetOption = result.getByLabelText('new note');
    expect(targetOption).toBeTruthy();

    fireEvent.click(targetOption);
  });

  expect(dispatch).toBeCalledTimes(1);
});
