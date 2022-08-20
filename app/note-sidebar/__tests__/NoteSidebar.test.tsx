/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { render } from '@testing-library/react';
import React from 'react';

import { NoteSidebar } from '../NoteSidebar';

test('renders correctly', () => {
  let onDismiss = jest.fn();
  let result = render(
    <div>
      <NoteSidebar onDismiss={onDismiss} widgets={[]} />
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});
