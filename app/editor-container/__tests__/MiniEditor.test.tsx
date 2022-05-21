/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';

import { workspace } from '@bangle.io/api';
import {
  createBasicTestStore,
  setupMockWorkspaceWithNotes,
  TestStoreProvider,
} from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';
import { resolvePath } from '@bangle.io/ws-path';

import { MiniEditor } from '../MiniEditor';

describe('MiniEditor', () => {
  const setup = async () => {
    let { store, getActionNames } = createBasicTestStore({
      extensions: [],
      useEditorCoreExtension: true,
      useEditorManagerSlice: true,
    });

    const wsPath = 'my-ws:test-dir/magic.md';

    const { wsName } = resolvePath(wsPath);

    await setupMockWorkspaceWithNotes(store, wsName, [
      [wsPath, `# hello mars`],
    ]);

    const { container, getByLabelText } = render(
      <div>
        <TestStoreProvider
          editorManagerContextProvider={true}
          bangleStore={store}
          bangleStoreChanged={0}
        >
          <MiniEditor wsPath={wsPath} />
        </TestStoreProvider>
      </div>,
    );

    await act(async () => {
      await sleep(0);
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
