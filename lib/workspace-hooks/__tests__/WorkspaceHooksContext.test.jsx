import { listAllFiles, deleteFile } from 'workspace/index';
import { renderHook, act } from '@testing-library/react-hooks';
import { useDeleteNote, useFiles } from '../WorkspaceHooksContext';
import { render } from '@testing-library/react';
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom';
import React from 'react';
jest.mock('workspace/index', () => {
  const actual = jest.requireActual('workspace/index');
  return {
    ...actual,
    deleteFile: jest.fn(async () => {}),
    listAllFiles: jest.fn(async () => []),
  };
});

describe('useFiles', () => {
  test('works', async () => {
    let render;

    act(() => {
      render = renderHook(() => useFiles('test-ws1'));
    });

    let promise;
    await act(async () => {
      return promise;
    });

    expect(render.result.current).toEqual({
      fileWsPaths: [],
      noteWsPaths: [],
      refreshWsPaths: expect.any(Function),
    });
    expect(listAllFiles).toBeCalledTimes(1);
    expect(listAllFiles).nthCalledWith(1, 'test-ws1');
  });

  test('refreshes correctly', async () => {
    let render;

    act(() => {
      render = renderHook(() => useFiles('test-ws1'));
    });

    let promise;
    await act(async () => {
      return promise;
    });

    expect(render.result.current).toEqual({
      fileWsPaths: [],
      noteWsPaths: [],
      refreshWsPaths: expect.any(Function),
    });

    listAllFiles.mockImplementation(async () => {
      return ['test-ws1:hi.md', 'test-ws1:img.png'];
    });
    await act(async () => {
      return render.result.current.refreshWsPaths();
    });

    expect(render.result.current).toEqual({
      fileWsPaths: ['test-ws1:hi.md', 'test-ws1:img.png'],
      noteWsPaths: ['test-ws1:hi.md'],
      refreshWsPaths: expect.any(Function),
    });
  });
});

describe('useDeleteNote', () => {
  test('works', async () => {
    let callback;
    let testLocation;
    const refreshWsPaths = jest.fn();
    function Comp() {
      callback = useDeleteNote({ refreshWsPaths });
      return <div>Hello</div>;
    }

    await render(
      <Router initialEntries={['/ws/kujo/one.md']}>
        <Switch>
          <Route path={['/ws/:wsName']}>
            <Comp />
          </Route>
        </Switch>
        <Route
          path="*"
          render={({ history, location }) => {
            testLocation = location;
            return null;
          }}
        />
      </Router>,
    );

    expect(testLocation.pathname).toBe('/ws/kujo/one.md');

    expect(callback).not.toBeUndefined();

    const result = callback('kujo:one.md');
    expect(result).toBeInstanceOf(Promise);

    await result;

    // should remove it from the current path
    expect(testLocation.pathname).toBe('/ws/kujo');

    expect(deleteFile).toBeCalledTimes(1);
    expect(deleteFile).toBeCalledWith('kujo:one.md');
    expect(refreshWsPaths).toBeCalledTimes(1);
  });
});
