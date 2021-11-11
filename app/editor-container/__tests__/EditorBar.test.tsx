import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { EditorBar } from '../EditorBar';

test('renders correctly', () => {
  let result = render(
    <div>
      <EditorBar
        showSplitEditor={false}
        wsPath={'mojo:test-dir/magic.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorActive={false}
      ></EditorBar>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});

test('renders splitscreen', () => {
  let result = render(
    <div>
      <EditorBar
        showSplitEditor={true}
        wsPath={'mojo:test-dir/magic.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorActive={true}
      ></EditorBar>
    </div>,
  );

  const splitButton = () => result.getByLabelText('Split screen');

  expect([...splitButton().classList.values()]).toContain('is-active');

  result.rerender(
    <div>
      <EditorBar
        showSplitEditor={true}
        wsPath={'mojo:test-dir/magic.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorActive={false}
      ></EditorBar>
    </div>,
  );

  expect([...splitButton().classList.values()]).not.toContain('is-active');
});
