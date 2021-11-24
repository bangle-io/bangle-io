import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { CORE_PALETTES_TOGGLE_NOTES_PALETTE } from '@bangle.io/constants';

import { EditorBar } from '../EditorBar';

test('renders correctly', () => {
  let dispatchAction = jest.fn();
  let result = render(
    <div>
      <EditorBar
        isActive={false}
        dispatchAction={dispatchAction}
        showSplitEditor={false}
        wsPath={'mojo:test-dir/magic.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorOpen={false}
      />
    </div>,
  );

  expect(result.getByLabelText('note path').className).not.toContain('active');

  expect(result.container).toMatchSnapshot();
});

test('renders correctly when active', () => {
  let dispatchAction = jest.fn();
  let result = render(
    <div>
      <EditorBar
        isActive={true}
        dispatchAction={dispatchAction}
        showSplitEditor={false}
        wsPath={'mojo:test-dir/magic.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorOpen={false}
      />
    </div>,
  );

  expect(result.getByLabelText('note path').className).toContain('active');

  expect(result.container).toMatchSnapshot();
});

test('truncates large wsPath', () => {
  let dispatchAction = jest.fn();

  let result = render(
    <div>
      <EditorBar
        isActive={false}
        dispatchAction={dispatchAction}
        showSplitEditor={false}
        wsPath={'mojo:test-dir/magic/wow/last/two.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorOpen={false}
      />
    </div>,
  );

  expect(result.getByLabelText('note path')).toMatchSnapshot();
});

test('dispatches action on clicking wsPath', () => {
  let dispatchAction = jest.fn();

  let result = render(
    <div>
      <EditorBar
        isActive={false}
        dispatchAction={dispatchAction}
        showSplitEditor={true}
        wsPath={'mojo:test-dir/magic.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorOpen={true}
      />
    </div>,
  );

  fireEvent.click(result.getByLabelText('note path'));

  expect(dispatchAction).toBeCalledTimes(1);
  expect(dispatchAction).nthCalledWith(1, {
    name: CORE_PALETTES_TOGGLE_NOTES_PALETTE,
  });
});

test('renders splitscreen', () => {
  let dispatchAction = jest.fn();

  let result = render(
    <div>
      <EditorBar
        isActive={false}
        dispatchAction={dispatchAction}
        showSplitEditor={true}
        wsPath={'mojo:test-dir/magic.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorOpen={true}
      />
    </div>,
  );

  const splitButton = () => result.getByLabelText('Split screen');

  expect([...splitButton().classList.values()]).toContain('is-active');

  result.rerender(
    <div>
      <EditorBar
        isActive={false}
        dispatchAction={dispatchAction}
        showSplitEditor={true}
        wsPath={'mojo:test-dir/magic.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorOpen={false}
      />
    </div>,
  );

  expect([...splitButton().classList.values()]).not.toContain('is-active');
});
