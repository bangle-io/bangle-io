/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { Dialog, DialogContainer } from '@adobe/react-spectrum';
import { getByText, render, screen } from '@testing-library/react';
import React from 'react';

import { TestProvider } from '@bangle.io/test-utils-react';
import { setupSliceTestStore } from '@bangle.io/test-utils-slice';

import { WorkspaceCreateSelectTypeDialog } from '../WorkspaceCreateSelectTypeDialog';

let abortController = new AbortController();

beforeEach(() => {
  abortController = new AbortController();
});

afterEach(() => {
  abortController.abort();
});

test('renders without crashing', () => {
  const ctx = setupSliceTestStore({
    abortSignal: abortController.signal,
  });
  render(
    <TestProvider store={ctx.store}>
      <DialogContainer onDismiss={() => {}}>
        <WorkspaceCreateSelectTypeDialog />
      </DialogContainer>
    </TestProvider>,
  );
});
