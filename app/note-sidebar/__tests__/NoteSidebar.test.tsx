import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { NoteSidebar } from '../NoteSidebar';

test('renders correctly', () => {
  let onDismiss = jest.fn();
  let result = render(
    <div>
      <NoteSidebar onDismiss={onDismiss} />
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});
