import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { useBangleStoreDispatch } from '@bangle.io/app-state-context';
import { CORE_PALETTES_TOGGLE_NOTES_PALETTE } from '@bangle.io/constants';
import { toggleNotesPalette } from '@bangle.io/core-operations';

import { EditorBar } from '../EditorBar';

jest.mock('@bangle.io/app-state-context', () => {
  const obj = jest.requireActual('@bangle.io/app-state-context');
  return {
    ...obj,
    useBangleStoreDispatch: jest.fn(() => () => {}),
  };
});

jest.mock('@bangle.io/core-operations', () => {
  const operations = jest.requireActual('@bangle.io/core-operations');

  return {
    ...operations,
    toggleNotesPalette: jest.fn(() => () => {}),
  };
});

const toggleNotesPaletteMock = toggleNotesPalette as jest.MockedFunction<
  typeof toggleNotesPalette
>;

beforeEach(() => {
  (useBangleStoreDispatch as any).mockImplementation(() => () => {});
  toggleNotesPaletteMock.mockImplementation(() => () => {});
});

test('renders correctly', () => {
  let result = render(
    <div>
      <EditorBar
        isActive={false}
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
  let result = render(
    <div>
      <EditorBar
        isActive={true}
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
  let result = render(
    <div>
      <EditorBar
        isActive={false}
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
  let result = render(
    <div>
      <EditorBar
        isActive={false}
        showSplitEditor={true}
        wsPath={'mojo:test-dir/magic.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorOpen={true}
      />
    </div>,
  );

  fireEvent.click(result.getByLabelText('note path'));

  expect(toggleNotesPaletteMock).toBeCalledTimes(1);
});

test('renders splitscreen', () => {
  let result = render(
    <div>
      <EditorBar
        isActive={false}
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
