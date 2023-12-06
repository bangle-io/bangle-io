/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { getByText, render } from '@testing-library/react';
import React from 'react';

import { ReactSpectrumProvider } from '@bangle.io/test-utils-react';

import { WorkspaceCreateSelectTypeDialog } from '../WorkspaceCreateSelectTypeDialog';

test('renders without crashing', () => {
  render(
    <ReactSpectrumProvider>
      <WorkspaceCreateSelectTypeDialog />
    </ReactSpectrumProvider>,
  );
});

test('disabled native', () => {
  const { container } = render(
    <ReactSpectrumProvider>
      <WorkspaceCreateSelectTypeDialog />
    </ReactSpectrumProvider>,
  );
  expect(getByText(container, 'Local File Storage')).toBeDefined();
});
