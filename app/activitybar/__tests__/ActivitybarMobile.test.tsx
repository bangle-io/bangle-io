import { act, fireEvent, render } from '@testing-library/react';
import React, { useEffect, useState } from 'react';

import { useActionContext } from '@bangle.io/action-context';
import { CORE_PALETTES_TOGGLE_NOTES_PALETTE } from '@bangle.io/constants';
import { useUIManagerContext } from '@bangle.io/ui-context';

import { Activitybar } from '../Activitybar';

jest.mock('@bangle.io/ui-context', () => {
  const otherThings = jest.requireActual('@bangle.io/ui-context');
  return {
    ...otherThings,
    useUIManagerContext: jest.fn(() => ({})),
  };
});

jest.mock('@bangle.io/action-context', () => {
  const otherThings = jest.requireActual('@bangle.io/action-context');
  return {
    ...otherThings,
    useActionContext: jest.fn(() => ({})),
  };
});

beforeEach(() => {
  (useUIManagerContext as any).mockImplementation(() => {
    return {
      changelogHasUpdates: false,
      sidebar: undefined,
      dispatch: () => {},
      widescreen: false,
    };
  });
  (useActionContext as any).mockImplementation(() => {
    return { dispatchAction: jest.fn() };
  });
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
  let dispatchAction = jest.fn();
  (useActionContext as any).mockImplementation(() => {
    return { dispatchAction };
  });

  let result = render(
    <div>
      <Activitybar
        actionKeybindings={{}}
        sidebars={[]}
        primaryWsPath={'my-thing:wow.md'}
      ></Activitybar>
    </div>,
  );
  act(() => {
    fireEvent.click(result.getByRole('button'));
  });
  expect(dispatchAction).toBeCalledTimes(1);
  expect(dispatchAction).nthCalledWith(1, {
    name: CORE_PALETTES_TOGGLE_NOTES_PALETTE,
  });
});
