import { render } from '@testing-library/react';
import React from 'react';

import type { ActionHandler } from '@bangle.io/shared-types';
import { useUIManagerContext } from '@bangle.io/ui-context';

import { SearchNotesActionHandler } from '../action-handler';
import {
  EXECUTE_SEARCH_ACTION,
  SHOW_SEARCH_SIDEBAR_ACTION,
  SIDEBAR_NAME,
} from '../constants';
import { useSearchNotes, useSearchNotesState } from '../hooks';

jest.mock('@bangle.io/ui-context', () => {
  return {
    useUIManagerContext: jest.fn(),
  };
});
jest.mock('../hooks', () => {
  const actual = jest.requireActual('../hooks');
  return {
    ...actual,
    useSearchNotes: jest.fn(),
    useSearchNotesState: jest.fn(),
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
  (useSearchNotesState as any).mockImplementation(() => [
    { searchQuery: '', searchResults: null, pendingSearch: false },
    jest.fn(),
  ]);
});

afterEach(() => {
  document.querySelector = originalQuerySelector;
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

describe('actions', () => {
  let dispatchAction: ActionHandler;
  let registerActionHandler;

  beforeEach(async () => {
    let deregister = jest.fn();
    registerActionHandler = (_handler) => {
      dispatchAction = _handler;
      return deregister;
    };
  });

  test('focuses correctly on input if sidebar is already open', async () => {
    const inputElement = {
      focus: jest.fn(),
      select: jest.fn(),
    };
    document.querySelector = jest.fn(() => inputElement);
    const renderResult = render(
      <SearchNotesActionHandler
        registerActionHandler={registerActionHandler}
      />,
    );

    expect(useSearchNotes).toBeCalledTimes(1);

    expect(renderResult.container).toMatchInlineSnapshot(`<div />`);
    dispatchAction!({
      name: SHOW_SEARCH_SIDEBAR_ACTION,
    });

    expect(useUIManagerContextReturn.dispatch).toBeCalledTimes(1);

    useUIManagerContextReturn.sidebar = SIDEBAR_NAME;
    expect(document.querySelector).toBeCalledTimes(0);

    renderResult.rerender(
      <SearchNotesActionHandler
        registerActionHandler={registerActionHandler}
      />,
    );

    dispatchAction!({
      name: SHOW_SEARCH_SIDEBAR_ACTION,
    });

    expect(useUIManagerContextReturn.dispatch).toBeCalledTimes(2);
    expect(document.querySelector).toBeCalledTimes(1);
    expect(document.querySelector).nthCalledWith(
      1,
      `input[aria-label="Search"]`,
    );
    expect(inputElement.focus).toBeCalledTimes(1);
    expect(inputElement.select).toBeCalledTimes(1);
  });

  test('execute search action updates extension state correctly', async () => {
    let updateStateCb: any;
    const updateState = jest.fn((_cb) => {
      updateStateCb = _cb;
    });
    (useSearchNotesState as any).mockImplementation(() => [
      { searchQuery: '', searchResults: null, pendingSearch: false },
      updateState,
    ]);

    const renderResult = render(
      <SearchNotesActionHandler
        registerActionHandler={registerActionHandler}
      />,
    );
    expect(renderResult.container).toMatchInlineSnapshot(`<div />`);
    dispatchAction!({
      name: EXECUTE_SEARCH_ACTION,
      value: 'hello world',
    });

    expect(updateState).toBeCalledTimes(1);
    // passing a:1 to test if existing properties are retained or not
    expect(updateStateCb({ a: 1 })).toEqual({
      a: 1,
      searchQuery: 'hello world',
    });

    expect(useSearchNotes).toBeCalledTimes(1);
  });
});

test('passes searchQuery correct to search notes', async () => {
  (useSearchNotesState as any).mockImplementation(() => [
    { searchQuery: 'hello', searchResults: [], pendingSearch: false },
    jest.fn(),
  ]);

  render(
    <SearchNotesActionHandler
      registerActionHandler={(_handler) => {
        return jest.fn();
      }}
    />,
  );
  expect(useSearchNotes).toBeCalledTimes(1);
  expect(useSearchNotes).nthCalledWith(1);
});
