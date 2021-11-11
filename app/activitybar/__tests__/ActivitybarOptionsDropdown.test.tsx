import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import {
  ActivitybarOptionsDropdown,
  NewNoteKey,
} from '../ActivitybarOptionsDropdown';

test('renders correctly', () => {
  let result = render(
    <div>
      <ActivitybarOptionsDropdown widescreen={true} dispatchAction={() => {}} />
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});

test('clicking the button shows dropdown', async () => {
  let result = render(
    <div>
      <ActivitybarOptionsDropdown widescreen={true} dispatchAction={() => {}} />
    </div>,
  );

  act(() => {
    fireEvent.click(result.getByLabelText('Options'));
  });

  let targetOption;
  await waitFor(() => {
    targetOption = result.container.querySelectorAll('li li[data-key]');
    expect(targetOption).toBeTruthy();
  });

  expect(targetOption).toMatchSnapshot();
});

test('clicking items in dropdown dispatches event', async () => {
  const dispatch = jest.fn();
  let result = render(
    <div>
      <ActivitybarOptionsDropdown
        widescreen={true}
        dispatchAction={dispatch}
      ></ActivitybarOptionsDropdown>
    </div>,
  );

  act(() => {
    fireEvent.click(result.getByLabelText('Options'));
  });

  let targetOption;

  await waitFor(() => {
    targetOption = result.container.querySelector(
      `li li[data-key="${NewNoteKey}"]`,
    );
    expect(targetOption).toBeTruthy();

    fireEvent.click(targetOption);
  });

  expect(dispatch).toBeCalledTimes(1);
  expect(dispatch).nthCalledWith(1, {
    name: 'action::bangle-io-core-actions:NEW_NOTE_ACTION',
  });
});
