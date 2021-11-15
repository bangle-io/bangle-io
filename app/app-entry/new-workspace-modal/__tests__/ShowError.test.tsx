import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';

import { useUIManagerContext } from '@bangle.io/ui-context';

import {
  ERROR_PICKING_DIRECTORY_ERROR,
  INVALID_WORKSPACE_NAME_ERROR,
  UNKNOWN_ERROR,
  WORKSPACE_AUTH_REJECTED_ERROR,
  WORKSPACE_NAME_ALREADY_EXISTS_ERROR,
} from '../common';
import { ShowError } from '../ShowError';

jest.mock('@bangle.io/ui-context', () => {
  const otherThings = jest.requireActual('@bangle.io/ui-context');
  return {
    ...otherThings,
    useUIManagerContext: jest.fn(() => ({})),
  };
});

test('renders correctly UNKNOWN_ERROR', () => {
  let result = render(
    <div>
      <ShowError errorType={UNKNOWN_ERROR} closeModal={jest.fn()}></ShowError>
    </div>,
  );

  expect(result.container.innerHTML).toContain('unknown error');
  expect(result.container).toMatchSnapshot();
});

test('renders correctly ERROR_PICKING_DIRECTORY_ERROR', () => {
  let result = render(
    <div>
      <ShowError
        errorType={ERROR_PICKING_DIRECTORY_ERROR}
        closeModal={jest.fn()}
      ></ShowError>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});

test('renders correctly INVALID_WORKSPACE_NAME_ERROR', () => {
  let result = render(
    <div>
      <ShowError
        errorType={INVALID_WORKSPACE_NAME_ERROR}
        closeModal={jest.fn()}
      ></ShowError>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});

test('renders correctly WORKSPACE_AUTH_REJECTED_ERROR', () => {
  let result = render(
    <div>
      <ShowError
        errorType={WORKSPACE_AUTH_REJECTED_ERROR}
        closeModal={jest.fn()}
      ></ShowError>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});

test('renders correctly WORKSPACE_NAME_ALREADY_EXISTS_ERROR', () => {
  let result = render(
    <div>
      <ShowError
        errorType={WORKSPACE_NAME_ALREADY_EXISTS_ERROR}
        closeModal={jest.fn()}
      ></ShowError>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});
