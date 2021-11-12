import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import {
  CORE_ACTIONS_NEW_NOTE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
} from '@bangle.io/constants';

import {
  ActivitybarOptionsDropdown,
  NewNoteKey,
} from '../ActivitybarOptionsDropdown';

const actionKeybindings = {
  [CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE]: 'Ctrl-P',
};
test('renders correctly', () => {
  let result = render(
    <div>
      <ActivitybarOptionsDropdown
        actionKeybindings={actionKeybindings}
        widescreen={true}
        dispatchAction={() => {}}
      />
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});

test('clicking the button shows dropdown', async () => {
  let result = render(
    <div>
      <ActivitybarOptionsDropdown
        actionKeybindings={actionKeybindings}
        widescreen={true}
        dispatchAction={() => {}}
      />
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

  // check if keyboard shortcut is hsown
  // note: kbd utility prettifies 'Ctrl-P' to 'Ctrl-⇧'
  expect([...targetOption].find((t) => t.innerHTML.includes('⇧'))).toBeTruthy();

  expect(targetOption).toMatchSnapshot();
});

test('clicking items in dropdown dispatches event', async () => {
  const dispatch = jest.fn();
  let result = render(
    <div>
      <ActivitybarOptionsDropdown
        actionKeybindings={actionKeybindings}
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
    name: CORE_ACTIONS_NEW_NOTE,
  });
});
