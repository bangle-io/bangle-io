/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';

import {
  createBasicTestStore,
  setupMockWorkspaceWithNotes,
  TestStoreProvider,
} from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';
import { resolvePath } from '@bangle.io/ws-path';

import { MiniEditor } from '../MiniEditor';

describe('MiniEditor', () => {
  test('works', async () => {
    let { store } = createBasicTestStore({
      extensions: [],
      useEditorCoreExtension: true,
      useEditorManagerSlice: true,
    });

    const wsPath = 'my-ws:test-dir/magic.md';

    const { wsName } = resolvePath(wsPath);

    await setupMockWorkspaceWithNotes(store, wsName, [
      [wsPath, `# hello mars`],
    ]);

    const { container } = render(
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

    expect(container.innerHTML).toContain('hello mars');
    expect(container).toMatchSnapshot();
  });
});
