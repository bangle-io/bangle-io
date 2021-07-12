import { render } from '@testing-library/react';
import React from 'react';
import { useUIManagerContext } from 'ui-context';
import { SearchNotesActionHandler } from '../SearchNotesActionHandler';
import { ActionHandler } from 'extension-registry';
import { SHOW_SEARCH_SIDEBAR_ACTION, SIDEBAR_NAME } from '../types';

jest.mock('ui-context', () => {
  return {
    useUIManagerContext: jest.fn(),
  };
});

let useUIManagerContextReturn;
let originalQuerySelector = document.querySelector;
beforeEach(() => {
  document.querySelector = originalQuerySelector;
  useUIManagerContextReturn = {
    sidebar: null,
    dispatch: jest.fn(),
  };
  (useUIManagerContext as any).mockImplementation(() => {
    return useUIManagerContextReturn;
  });
});

test('deregisters action handler', async () => {
  let deregister = jest.fn();
  const renderResult = render(
    <SearchNotesActionHandler
      registerActionHandler={(_handler) => {
        return deregister;
      }}
    />,
  );

  renderResult.unmount();
  expect(deregister).toBeCalledTimes(1);
});

test('focuses correctly on input if sidebar is already open', async () => {
  let callback: ActionHandler;
  let deregister = jest.fn();
  const inputElement = {
    focus: jest.fn(),
    select: jest.fn(),
  };
  document.querySelector = jest.fn(() => inputElement);
  const registerActionHandler = (_handler) => {
    callback = _handler;
    return deregister;
  };
  const renderResult = render(
    <SearchNotesActionHandler registerActionHandler={registerActionHandler} />,
  );

  expect(renderResult.container).toMatchInlineSnapshot(`<div />`);
  callback!({
    name: SHOW_SEARCH_SIDEBAR_ACTION,
  });

  expect(useUIManagerContextReturn.dispatch).toBeCalledTimes(1);

  useUIManagerContextReturn.sidebar = SIDEBAR_NAME;
  expect(document.querySelector).toBeCalledTimes(0);

  renderResult.rerender(
    <SearchNotesActionHandler registerActionHandler={registerActionHandler} />,
  );

  callback!({
    name: SHOW_SEARCH_SIDEBAR_ACTION,
  });

  expect(useUIManagerContextReturn.dispatch).toBeCalledTimes(2);
  expect(document.querySelector).toBeCalledTimes(1);
  expect(document.querySelector).nthCalledWith(1, `input[aria-label="Search"]`);
  expect(inputElement.focus).toBeCalledTimes(1);
  expect(inputElement.select).toBeCalledTimes(1);
});
