import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { PickStorageDirectory } from '../Buttons';

jest.mock('@bangle.io/slice-ui', () => {
  const otherThings = jest.requireActual('@bangle.io/slice-ui');
  return {
    ...otherThings,
    useUIManagerContext: jest.fn(() => ({})),
  };
});

const dirName = 'test-handle';

test('renders correctly', () => {
  let updateRootDirHandle = jest.fn();

  let result = render(
    <div>
      <PickStorageDirectory
        setError={jest.fn() as any}
        dirName={dirName}
        updateRootDirHandle={updateRootDirHandle}
      ></PickStorageDirectory>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});

test('clear rootDirHandle', async () => {
  let updateRootDirHandle = jest.fn();

  let result = render(
    <div>
      <PickStorageDirectory
        setError={jest.fn() as any}
        dirName={dirName}
        updateRootDirHandle={updateRootDirHandle}
      />
    </div>,
  );

  fireEvent.click(result.getByLabelText('pick directory'));

  expect(result.container).toMatchSnapshot();
  expect(updateRootDirHandle).toBeCalledTimes(1);
  expect(updateRootDirHandle).nthCalledWith(1, undefined);
});
