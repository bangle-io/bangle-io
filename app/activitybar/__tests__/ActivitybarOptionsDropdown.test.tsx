/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { useSerialOperationContext } from '@bangle.io/api';
import { CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE } from '@bangle.io/constants';

import { ActivitybarOptionsDropdown } from '../ActivitybarOptionsDropdown';

jest.mock('@bangle.io/api', () => {
  const rest = jest.requireActual('@bangle.io/api');

  return {
    ...rest,
    useSerialOperationContext: jest.fn(() => ({})),
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

let useSerialOperationContextMock =
  useSerialOperationContext as jest.MockedFunction<
    typeof useSerialOperationContext
  >;

let dispatchSerialOperationMock = jest.fn();
beforeEach(() => {
  dispatchSerialOperationMock = jest.fn();
  useSerialOperationContextMock.mockImplementation(() => {
    return { dispatchSerialOperation: dispatchSerialOperationMock };
  });
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

test('renders mobile correctly', () => {
  let result = render(
    <div>
      <ActivitybarOptionsDropdown
        operationKeybindings={operationKeybindings}
        widescreen={false}
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

  expect(dispatchSerialOperationMock).toBeCalledTimes(1);
});
