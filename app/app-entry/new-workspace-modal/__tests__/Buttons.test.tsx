import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { PickStorageDirectory } from '../Buttons';

jest.mock('@bangle.io/ui-context', () => {
  const otherThings = jest.requireActual('@bangle.io/ui-context');
  return {
    ...otherThings,
    useUIManagerContext: jest.fn(() => ({})),
  };
});

test('renders correctly', () => {
  let updateRootDirHandle = jest.fn();
  let rootDirHandle: any = { name: 'test-handle' };

  let result = render(
    <div>
      <PickStorageDirectory
        setError={jest.fn() as any}
        rootDirHandle={rootDirHandle}
        updateRootDirHandle={updateRootDirHandle}
      ></PickStorageDirectory>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});

test('clear rootDirHandle', async () => {
  let updateRootDirHandle = jest.fn();
  let rootDirHandle: any = { name: 'test-handle' };

  let result = render(
    <div>
      <PickStorageDirectory
        setError={jest.fn() as any}
        rootDirHandle={rootDirHandle}
        updateRootDirHandle={updateRootDirHandle}
      />
    </div>,
  );

  fireEvent.click(result.getByLabelText('pick directory'));

  expect(result.container).toMatchSnapshot();
  expect(updateRootDirHandle).toBeCalledTimes(1);
  expect(updateRootDirHandle).nthCalledWith(1, undefined);
});
