import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { CORE_PALETTES_TOGGLE_NOTES_PALETTE } from '@bangle.io/constants';

import { EditorBar } from '../EditorBar';

test('renders correctly', () => {
  let dispatchAction = jest.fn();
  let result = render(
    <div>
      <EditorBar
        dispatchAction={dispatchAction}
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

test('truncates large wsPath', () => {
  let dispatchAction = jest.fn();

  let result = render(
    <div>
      <EditorBar
        dispatchAction={dispatchAction}
        showSplitEditor={false}
        wsPath={'mojo:test-dir/magic/wow/last/two.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorActive={false}
      ></EditorBar>
    </div>,
  );

  expect(result.getByLabelText('note path')).toMatchSnapshot();
});

test('dispatches action on clicking wsPath', () => {
  let dispatchAction = jest.fn();

  let result = render(
    <div>
      <EditorBar
        dispatchAction={dispatchAction}
        showSplitEditor={true}
        wsPath={'mojo:test-dir/magic.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorActive={true}
      ></EditorBar>
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
        dispatchAction={dispatchAction}
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
        dispatchAction={dispatchAction}
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
