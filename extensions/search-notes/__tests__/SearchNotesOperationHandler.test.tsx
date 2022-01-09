import { render } from '@testing-library/react';
import React from 'react';

import { useSerialOperationHandler } from '@bangle.io/serial-operation-context';
import type { SerialOperationHandler } from '@bangle.io/shared-types';
import { getUseUIManagerContextReturn } from '@bangle.io/test-utils/function-mock-return';
import { changeSidebar, useUIManagerContext } from '@bangle.io/ui-context';

import {
  EXECUTE_SEARCH_OPERATION as EXECUTE_SEARCH_OP,
  SHOW_SEARCH_SIDEBAR_OPERATION as SHOW_SEARCH_SIDEBAR_OP,
  SIDEBAR_NAME,
} from '../constants';
import { useSearchNotes, useSearchNotesState } from '../hooks';
import { SearchNotesOperationHandler } from '../SearchNotesOperationHandler';

jest.mock('@bangle.io/ui-context', () => {
  const actual = jest.requireActual('@bangle.io/ui-context');

  return {
    ...actual,
    changeSidebar: jest.fn(() => () => {}),
    useUIManagerContext: jest.fn(),
  };
});

jest.mock('@bangle.io/serial-operation-context', () => {
  return {
    useSerialOperationHandler: jest.fn(),
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

let useUIManagerContextReturn: typeof getUseUIManagerContextReturn;

let useSerialOperationHandlerMock =
  useSerialOperationHandler as jest.MockedFunction<
    typeof useSerialOperationHandler
  >;
let useUIManagerContextMock = useUIManagerContext as jest.MockedFunction<
  typeof useUIManagerContext
>;

let changeSidebarMock = changeSidebar as jest.MockedFunction<
  typeof changeSidebar
>;

let originalQuerySelector = document.querySelector;
beforeEach(() => {
  document.querySelector = originalQuerySelector;
  useUIManagerContextReturn = {
    ...getUseUIManagerContextReturn,
    sidebar: null,
    dispatch: jest.fn(),
  };
  useUIManagerContextMock.mockImplementation(() => {
    return { ...useUIManagerContextReturn };
  });
  (useSearchNotesState as any).mockImplementation(() => [
    { searchQuery: '', searchResults: null, pendingSearch: false },
    jest.fn(),
  ]);

  const changeSidebarRet = jest.fn();
  changeSidebarMock.mockImplementation(() => changeSidebarRet);
});

afterEach(() => {
  document.querySelector = originalQuerySelector;
});

describe('operations', () => {
  let dispatchSOp: SerialOperationHandler;

  beforeEach(async () => {
    useSerialOperationHandlerMock.mockImplementation((_handler) => {
      dispatchSOp = _handler;
    });
  });

  test('focuses correctly on input if sidebar is already open', async () => {
    const inputElement = {
      focus: jest.fn(),
      select: jest.fn(),
    };
    document.querySelector = jest.fn(() => inputElement);
    const renderResult = render(<SearchNotesOperationHandler />);

    expect(useSearchNotes).toBeCalledTimes(1);

    expect(renderResult.container).toMatchInlineSnapshot(`<div />`);
    dispatchSOp!({
      name: SHOW_SEARCH_SIDEBAR_OP,
    });

    expect(changeSidebarMock).toBeCalledTimes(1);
    expect(changeSidebarMock).nthCalledWith(
      1,
      'sidebar::@bangle.io/search-notes:search-notes',
    );

    useUIManagerContextReturn.sidebar = SIDEBAR_NAME;
    expect(document.querySelector).toBeCalledTimes(0);

    renderResult.rerender(<SearchNotesOperationHandler />);

    dispatchSOp!({
      name: SHOW_SEARCH_SIDEBAR_OP,
    });

    expect(changeSidebarMock).toBeCalledTimes(2);
    expect(changeSidebarMock).nthCalledWith(
      2,
      'sidebar::@bangle.io/search-notes:search-notes',
    );
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

    const renderResult = render(<SearchNotesOperationHandler />);
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

  render(<SearchNotesOperationHandler />);
  expect(useSearchNotes).toBeCalledTimes(1);
  expect(useSearchNotes).nthCalledWith(1);
});
