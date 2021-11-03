import { act, fireEvent, render } from '@testing-library/react';
import React, { useEffect, useState } from 'react';

import { WorkspaceSidebar } from '../WorkspaceSidebar';

let originalConsoleError = console.error;

beforeEach(() => {
  console.error = originalConsoleError;
});

test('handles error', () => {
  console.error = jest.fn();
  let result = render(
    <div>
      <WorkspaceSidebar
        sidebar={{
          name: 'sidebar::test-sidebar',
          title: 'search notes',
          icon: <span>test-icon</span>,
          ReactComponent: () => {
            throw new Error('Blah blah');
            return <span>something</span>;
          },
          hint: 'test-hint',
        }}
      ></WorkspaceSidebar>
    </div>,
  );
  expect(result.container.innerHTML).toContain('Blah blah');
});

test('renders', () => {
  let result = render(
    <div>
      <WorkspaceSidebar
        sidebar={{
          name: 'sidebar::test-sidebar',
          title: 'search notes',
          icon: <span>test-icon</span>,
          ReactComponent: () => {
            return <span>something</span>;
          },
          hint: 'test-hint',
        }}
      ></WorkspaceSidebar>
    </div>,
  );

  expect(result.container.innerHTML).toContain('something');
  expect(result.container).toMatchSnapshot();
});
