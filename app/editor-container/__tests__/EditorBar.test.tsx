/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { togglePaletteType } from '@bangle.io/slice-ui';

import { EditorBar } from '../EditorBar';

jest.mock('@bangle.io/slice-ui', () => {
  const operations = jest.requireActual('@bangle.io/slice-ui');

  return {
    ...operations,
    togglePaletteType: jest.fn(() => () => {}),
  };
});

const togglePaletteTypeMock = togglePaletteType as jest.MockedFunction<
  typeof togglePaletteType
>;

beforeEach(() => {
  togglePaletteTypeMock.mockImplementation(() => () => {});
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

  expect(result.getByLabelText('note path').className).not.toContain(
    'BU_active',
  );

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

  expect(result.getByLabelText('note path').className).toContain('BU_active');

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

test('dispatches togglePaletteType on clicking wsPath', () => {
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

  expect(togglePaletteTypeMock).toBeCalledTimes(1);
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

  expect([...splitButton().classList.values()]).toContain('BU_is-active');

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

  expect([...splitButton().classList.values()]).not.toContain('BU_is-active');
});
