import { listAllFiles, deleteFile } from 'workspaces/index';
import { renderHook, act } from '@testing-library/react-hooks';
import { useDeleteNote, useOpenedWsPaths, useFiles } from '../WorkspaceContext';
import { render } from '@testing-library/react';
import {
  MemoryRouter as Router,
  Switch,
  Route,
  useHistory,
  useLocation,
} from 'react-router-dom';
import React from 'react';

jest.mock('workspaces/index', () => {
  const actual = jest.requireActual('workspaces/index');
  return {
    ...actual,
    deleteFile: jest.fn(async () => {}),
    listAllFiles: jest.fn(async () => []),
  };
});

describe('useFiles', () => {
  let testLocation;
  function Comp({ children }) {
    return (
      <Router initialEntries={['/ws/test-ws1/one.md']}>
        <Switch>
          <Route path={['/ws/:wsName']}>{children}</Route>
        </Switch>
        <Route
          path="*"
          render={({ history, location }) => {
            testLocation = location;
            return null;
          }}
        />
      </Router>
    );
  }
  beforeEach(() => {
    testLocation = undefined;
  });
  test('works', async () => {
    let render;

    act(() => {
      render = renderHook(() => useFiles('test-ws1'), { wrapper: Comp });
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

  test('refreshes and preserves instance correctly', async () => {
    let render;

    act(() => {
      render = renderHook(() => useFiles('test-ws1'), { wrapper: Comp });
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

    const filesInstance = ['test-ws1:hi.md', 'test-ws1:img.png'];
    listAllFiles.mockImplementation(async () => {
      return filesInstance;
    });
    await act(async () => {
      return render.result.current.refreshWsPaths();
    });

    expect(render.result.current.fileWsPaths).toBe(filesInstance);

    expect(render.result.current).toEqual({
      fileWsPaths: ['test-ws1:hi.md', 'test-ws1:img.png'],
      noteWsPaths: ['test-ws1:hi.md'],
      refreshWsPaths: expect.any(Function),
    });

    // the same thing to check if the `===` instance is preserved
    listAllFiles.mockImplementation(async () => {
      return ['test-ws1:hi.md', 'test-ws1:img.png'];
    });
    await act(async () => {
      return render.result.current.refreshWsPaths();
    });
    expect(render.result.current.fileWsPaths).toBe(filesInstance);
  });
});

describe('useDeleteNote', () => {
  let refreshWsPaths, callback, testLocation, renderIt;

  beforeEach(() => {
    refreshWsPaths = jest.fn();
    testLocation = undefined;
    callback = undefined;
    renderIt = async (Comp, initialEntries = '/ws/kujo/one.md') => {
      await render(
        <Router initialEntries={[initialEntries]}>
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
    };
  });

  test('works', async () => {
    function Comp() {
      const history = useHistory();
      const location = useLocation();

      const { openedWsPaths, updateOpenedWsPaths } = useOpenedWsPaths(
        'kujo',
        history,
        location,
      );
      callback = useDeleteNote(
        'kujo',
        openedWsPaths,
        refreshWsPaths,
        updateOpenedWsPaths,
      );
      return <div>Hello</div>;
    }

    await renderIt(Comp);

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

  test('does not change location if delete path not active', async () => {
    function Comp() {
      const history = useHistory();
      const location = useLocation();

      const { openedWsPaths, updateOpenedWsPaths } = useOpenedWsPaths(
        'kujo',
        history,
        location,
      );
      callback = useDeleteNote(
        'kujo',
        openedWsPaths,
        refreshWsPaths,
        updateOpenedWsPaths,
      );
      return <div>Hello</div>;
    }

    await renderIt(Comp);

    expect(testLocation.pathname).toBe('/ws/kujo/one.md');

    const result = callback('kujo:two.md');

    await result;

    expect(testLocation.pathname).toBe('/ws/kujo/one.md');
  });

  test('updates secondary editor', async () => {
    function Comp() {
      const history = useHistory();
      const location = useLocation();
      const { openedWsPaths, updateOpenedWsPaths } = useOpenedWsPaths(
        'kujo',
        history,
        location,
      );
      callback = useDeleteNote(
        'kujo',
        openedWsPaths,
        refreshWsPaths,
        updateOpenedWsPaths,
      );
      return <div>Hello</div>;
    }

    await renderIt(Comp, '/ws/kujo/one.md?secondary=kujo:two.md');

    expect(testLocation.search).toBe('?secondary=kujo:two.md');

    const result = callback('kujo:two.md');

    await result;

    expect(testLocation.search).toBe('');
  });

  test('deletes multiple in a go', async () => {
    function Comp() {
      const history = useHistory();
      const location = useLocation();
      const { openedWsPaths, updateOpenedWsPaths } = useOpenedWsPaths(
        'kujo',
        history,
        location,
      );
      callback = useDeleteNote(
        'kujo',
        openedWsPaths,
        refreshWsPaths,
        updateOpenedWsPaths,
      );
      return <div>Hello</div>;
    }

    await renderIt(Comp, '/ws/kujo/one.md?secondary=kujo:two.md');

    expect(testLocation.pathname).toBe('/ws/kujo/one.md');
    expect(testLocation.search).toBe('?secondary=kujo:two.md');

    const result = callback(['kujo:two.md', 'kujo:one.md']);

    await result;

    expect(testLocation.search).toBe('');
    expect(testLocation.pathname).toBe('/ws/kujo');
  });
});
