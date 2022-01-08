import { render } from '@testing-library/react';
import React from 'react';

import type { SerialOperationHandler } from '@bangle.io/shared-types';
import { useUIManagerContext } from '@bangle.io/ui-context';

import {
  EXECUTE_SEARCH_OPERATION as EXECUTE_SEARCH_OP,
  SHOW_SEARCH_SIDEBAR_OPERATION as SHOW_SEARCH_SIDEBAR_OP,
  SIDEBAR_NAME,
} from '../constants';
import { useSearchNotes, useSearchNotesState } from '../hooks';
import { SearchNotesOperationHandler } from '../operation-handler';

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

test('deregisters handler', async () => {
  let deregister = jest.fn();
  const renderResult = render(
    <SearchNotesOperationHandler
      registerSerialOperationHandler={(_handler) => {
        return deregister;
      }}
    />,
  );

  renderResult.unmount();
  expect(deregister).toBeCalledTimes(1);
});

describe('operations', () => {
  let dispatchSOp: SerialOperationHandler;
  let registerSerialOperationHandler;

  beforeEach(async () => {
    let deregister = jest.fn();
    registerSerialOperationHandler = (_handler) => {
      dispatchSOp = _handler;
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
      <SearchNotesOperationHandler
        registerSerialOperationHandler={registerSerialOperationHandler}
      />,
    );

    expect(useSearchNotes).toBeCalledTimes(1);

    expect(renderResult.container).toMatchInlineSnapshot(`<div />`);
    dispatchSOp!({
      name: SHOW_SEARCH_SIDEBAR_OP,
    });

    expect(useUIManagerContextReturn.dispatch).toBeCalledTimes(1);

    useUIManagerContextReturn.sidebar = SIDEBAR_NAME;
    expect(document.querySelector).toBeCalledTimes(0);

    renderResult.rerender(
      <SearchNotesOperationHandler
        registerSerialOperationHandler={registerSerialOperationHandler}
      />,
    );

    dispatchSOp!({
      name: SHOW_SEARCH_SIDEBAR_OP,
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

  test('execute search operation updates extension state correctly', async () => {
    let updateStateCb: any;
    const updateState = jest.fn((_cb) => {
      updateStateCb = _cb;
    });
    (useSearchNotesState as any).mockImplementation(() => [
      { searchQuery: '', searchResults: null, pendingSearch: false },
      updateState,
    ]);

    const renderResult = render(
      <SearchNotesOperationHandler
        registerSerialOperationHandler={registerSerialOperationHandler}
      />,
    );
    expect(renderResult.container).toMatchInlineSnapshot(`<div />`);
    dispatchSOp!({
      name: EXECUTE_SEARCH_OP,
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
    <SearchNotesOperationHandler
      registerSerialOperationHandler={(_handler) => {
        return jest.fn();
      }}
    />,
  );
  expect(useSearchNotes).toBeCalledTimes(1);
  expect(useSearchNotes).nthCalledWith(1);
});
