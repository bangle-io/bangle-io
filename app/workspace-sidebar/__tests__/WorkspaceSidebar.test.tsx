/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';

import { WorkspaceSidebar } from '../WorkspaceSidebar';

let originalConsoleError = console.error;

beforeEach(() => {
  console.error = originalConsoleError;
});

test('handles error', () => {
  // silencing the error from polluting the logging
  console.error = jest.fn();
  let result = render(
    <div>
      <WorkspaceSidebar
        widescreen
        onDismiss={jest.fn()}
        sidebar={{
          name: 'sidebar::test-sidebar',
          title: 'search notes',
          activitybarIcon: <span>test-icon</span>,
          ReactComponent: () => {
            throw new Error('Blah blah');

            return <span>something</span>;
          },
          hint: 'test-hint',
        }}
      />
    </div>,
  );
  expect(result.container.innerHTML).toContain('Blah blah');
});

test('renders', () => {
  let result = render(
    <div>
      <WorkspaceSidebar
        widescreen
        onDismiss={jest.fn()}
        sidebar={{
          name: 'sidebar::test-sidebar',
          title: 'search notes',
          activitybarIcon: <span>test-icon</span>,
          ReactComponent: () => {
            return <span>something</span>;
          },
          hint: 'test-hint',
        }}
      />
    </div>,
  );

  expect(result.container.innerHTML).toContain('something');
  expect(result.container).toMatchSnapshot();
});

test('calls the dismiss button', () => {
  const onDismiss = jest.fn();
  let result = render(
    <div>
      <WorkspaceSidebar
        widescreen
        onDismiss={onDismiss}
        sidebar={{
          name: 'sidebar::test-sidebar',
          title: 'search notes',
          activitybarIcon: <span>test-icon</span>,
          ReactComponent: () => {
            return <span>something</span>;
          },
          hint: 'test-hint',
        }}
      />
    </div>,
  );

  act(() => {
    fireEvent.click(result.getByLabelText('Hide search notes'));
  });

  expect(onDismiss).toBeCalledTimes(1);
});
