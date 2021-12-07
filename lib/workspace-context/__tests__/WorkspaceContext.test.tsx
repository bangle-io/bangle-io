import { render } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react-hooks';
import React from 'react';
import {
  MemoryRouter as Router,
  Route,
  Switch,
  useHistory,
  useLocation,
} from 'react-router-dom';

import { FileOps } from '@bangle.io/workspaces';
import { Location, OpenedWsPaths } from '@bangle.io/ws-path';

import { useDeleteNote, useFiles, useOpenedWsPaths } from '../WorkspaceContext';

jest.mock('@bangle.io/workspaces', () => {
  const actual = jest.requireActual('@bangle.io/workspaces');
  return {
    ...actual,
    FileOps: {
      deleteFile: jest.fn(async () => {}),
      listAllFiles: jest.fn(async () => []),
    },
  };
});

describe('useFiles', () => {
  function Comp({ children }) {
    return (
      <Router initialEntries={['/ws/test-ws1/one.md']}>
        <Switch>
          <Route path={['/ws/:wsName']}>{children}</Route>
        </Switch>
        <Route
          path="*"
          render={({ history, location }) => {
            return null;
          }}
        />
      </Router>
    );
  }

  test('works', async () => {
    let render;

    act(() => {
      render = renderHook(() => useFiles('test-ws1', FileOps), {
        wrapper: Comp,
      });
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
    expect(FileOps.listAllFiles).toBeCalledTimes(1);
    expect(FileOps.listAllFiles).nthCalledWith(1, 'test-ws1');
  });

  test('refreshes and preserves instance correctly', async () => {
    let render;

    act(() => {
      render = renderHook(() => useFiles('test-ws1', FileOps), {
        wrapper: Comp,
      });
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
    FileOps.listAllFiles.mockImplementation(async () => {
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
    FileOps.listAllFiles.mockImplementation(async () => {
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
        jest.fn(),
      );
      callback = useDeleteNote(
        'kujo',
        openedWsPaths,
        refreshWsPaths,
        updateOpenedWsPaths,
        FileOps,
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

    expect(FileOps.deleteFile).toBeCalledTimes(1);
    expect(FileOps.deleteFile).toBeCalledWith('kujo:one.md');
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
        jest.fn(),
      );
      callback = useDeleteNote(
        'kujo',
        openedWsPaths,
        refreshWsPaths,
        updateOpenedWsPaths,
        FileOps,
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
        jest.fn(),
      );
      callback = useDeleteNote(
        'kujo',
        openedWsPaths,
        refreshWsPaths,
        updateOpenedWsPaths,
        FileOps,
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
        jest.fn(),
      );
      callback = useDeleteNote(
        'kujo',
        openedWsPaths,
        refreshWsPaths,
        updateOpenedWsPaths,
        FileOps,
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

describe('useOpenedWsPaths', () => {
  let onInvalidPath = jest.fn();
  let openedWsPaths: OpenedWsPaths | undefined;
  let updateOpenedWsPaths:
    | undefined
    | ReturnType<typeof useOpenedWsPaths>['updateOpenedWsPaths'];
  let testLocation: Location | undefined;
  let historyReplaceSpy;
  let historyPushSpy;

  const renderIt = async (initialEntry) => {
    function Comp() {
      const history = useHistory();
      const location = useLocation();
      historyReplaceSpy = jest.spyOn(history, 'replace');
      historyPushSpy = jest.spyOn(history, 'push');

      const result = useOpenedWsPaths('kujo', history, location, onInvalidPath);
      openedWsPaths = result.openedWsPaths;
      updateOpenedWsPaths = result.updateOpenedWsPaths;
      return <div>Hello</div>;
    }

    await render(
      <Router initialEntries={[initialEntry]}>
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

  beforeEach(() => {
    onInvalidPath = jest.fn();
    openedWsPaths = undefined;
    updateOpenedWsPaths = undefined;
    historyPushSpy = undefined;
    historyReplaceSpy = undefined;
    testLocation = undefined;
  });

  test('works', async () => {
    await renderIt('/ws/kujo/one.md');

    expect(testLocation?.pathname).toBe('/ws/kujo/one.md');

    expect(openedWsPaths?.toArray()).toEqual(['kujo:one.md', undefined]);
    expect(updateOpenedWsPaths).toBeInstanceOf(Function);
  });

  test('works with secondary', async () => {
    await renderIt('/ws/kujo/one.md?secondary=kujo:two.md');

    expect(openedWsPaths?.toArray()).toEqual(['kujo:one.md', 'kujo:two.md']);
    expect(updateOpenedWsPaths).toBeInstanceOf(Function);
  });

  test('calls updateOpenedWsPaths correctly 1', async () => {
    await renderIt('/ws/kujo/one.md');

    expect(testLocation?.pathname).toBe('/ws/kujo/one.md');

    expect(openedWsPaths?.toArray()).toEqual(['kujo:one.md', undefined]);

    act(() => {
      updateOpenedWsPaths?.((openedWsPaths) =>
        openedWsPaths.updateByIndex(0, 'kujo:two.md'),
      );
    });

    expect(historyReplaceSpy).toBeCalledTimes(0);
    expect(historyPushSpy).toBeCalledTimes(1);

    expect(testLocation?.pathname).toBe('/ws/kujo/two.md');
  });

  test('calls updateOpenedWsPaths correctly 2', async () => {
    await renderIt('/ws/kujo/one.md');

    expect(testLocation?.pathname).toBe('/ws/kujo/one.md');

    expect(openedWsPaths?.toArray()).toEqual(['kujo:one.md', undefined]);

    act(() => {
      updateOpenedWsPaths?.(new OpenedWsPaths(['kujo:two.md', undefined]));
    });

    expect(historyReplaceSpy).toBeCalledTimes(0);
    expect(historyPushSpy).toBeCalledTimes(1);
    expect(testLocation?.pathname).toBe('/ws/kujo/two.md');
  });

  test('calls updateOpenedWsPaths correctly with replace', async () => {
    await renderIt('/ws/kujo/one.md');

    expect(testLocation?.pathname).toBe('/ws/kujo/one.md');

    expect(openedWsPaths?.toArray()).toEqual(['kujo:one.md', undefined]);

    act(() => {
      updateOpenedWsPaths?.(
        (openedWsPaths) => openedWsPaths.updateByIndex(0, 'kujo:two.md'),
        {
          replaceHistory: true,
        },
      );
    });

    expect(historyReplaceSpy).toBeCalledTimes(1);
    expect(historyPushSpy).toBeCalledTimes(0);

    expect(testLocation?.pathname).toBe('/ws/kujo/two.md');
  });

  test('calls onInvalidPath correctly when invalid primary path', async () => {
    await renderIt('/ws/kujo/i-am-invalid-path');

    expect(onInvalidPath).toBeCalledTimes(1);

    expect(testLocation?.pathname).toBe('/ws/kujo/i-am-invalid-path');

    expect(openedWsPaths?.toArray()).toEqual([undefined, undefined]);

    expect(historyReplaceSpy).toBeCalledTimes(0);
    expect(historyPushSpy).toBeCalledTimes(0);
  });

  test('calls onInvalidPath correctly when invalid secondary path', async () => {
    await renderIt('/ws/kujo/one.md?secondary=kujo:two');

    expect(onInvalidPath).toBeCalledTimes(1);

    expect(openedWsPaths?.toArray()).toEqual(['kujo:one.md', undefined]);

    expect(historyReplaceSpy).toBeCalledTimes(0);
    expect(historyPushSpy).toBeCalledTimes(0);
  });
});
