/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import {
  createBasicTestStore,
  setupMockWorkspaceWithNotes,
  TestStoreProvider,
} from '@bangle.io/test-utils';
import { resolvePath } from '@bangle.io/ws-path';

import { MiniEditor } from '../MiniEditor';

const DOC_CONTENT = `hello mars`;

describe('MiniEditor', () => {
  const setup = async () => {
    let { store, getActionNames } = createBasicTestStore({
      extensions: [],
      useEditorCoreExtension: true,
      useUISlice: true,
      useEditorManagerSlice: true,
    });

    const wsPath = 'my-ws:test-dir/magic.md';

    const { wsName } = resolvePath(wsPath);

    await setupMockWorkspaceWithNotes(store, wsName, [[wsPath, DOC_CONTENT]]);

    const { container, getByLabelText } = render(
      <div>
        <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
          <MiniEditor wsPath={wsPath} />
        </TestStoreProvider>
      </div>,
    );

    await waitFor(() => {
      expect(container.innerHTML).toContain(DOC_CONTENT);
    });

    return { container, getByLabelText, getActionNames };
  };

  test('works', async () => {
    const { container } = await setup();
    expect(container.innerHTML).toContain('hello mars');
    expect(container).toMatchSnapshot();
  });

  test('minimize works', async () => {
    const { container, getByLabelText } = await setup();

    expect(container.innerHTML).toContain('hello mars');

    fireEvent.click(getByLabelText('Minimize'));

    expect(container.innerHTML).not.toContain('hello mars');
  });
});
