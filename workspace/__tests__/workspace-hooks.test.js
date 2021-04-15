import { render, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom';
import {
  useCreateMdFile,
  useDeleteFile,
  useGetWorkspaceFiles,
  useRenameActiveFile,
  useWorkspacePath,
  useWorkspaces,
} from '../workspace-hooks';
import * as idb from 'idb-keyval';
import { Workspace } from '../Workspace';
import { getWorkspaceInfo } from '../workspace-helpers';
import { IndexedDBFileSystem } from 'baby-fs';
const mockStore = new Map();
const mockBabyFSStore = new Map();

jest.mock('baby-fs', () => {
  const actual = jest.requireActual('baby-fs');
  return {
    ...actual,
    IndexedDBFileSystem: jest.fn(),
  };
});

jest.mock('idb-keyval', () => {
  const idb = {};
  idb.get = jest.fn(async (...args) => {
    return mockStore.get(...args);
  });
  idb.del = jest.fn(async (...args) => {
    return mockStore.delete(...args);
  });
  idb.set = jest.fn(async (...args) => {
    return mockStore.set(...args);
  });
  idb.keys = jest.fn(async (...args) => {
    return Array.from(mockStore.keys(...args));
  });
  return idb;
});

function createFileContent(textContent = 'hello') {
  return JSON.stringify({
    content: [
      {
        content: [{ text: textContent, type: 'text' }],
        type: 'paragraph',
      },
    ],
    type: 'doc',
  });
}

let idbFS;

beforeEach(() => {
  mockStore.clear();
  mockBabyFSStore.clear();
  const obj = {
    readFile: jest.fn(async (fileName) => {
      return mockBabyFSStore.get(fileName);
    }),
    writeFile: jest.fn(async (fileName, data) => {
      mockBabyFSStore.set(fileName, data);
    }),
    unlink: jest.fn(async (fileName) => {
      mockBabyFSStore.delete(fileName);
    }),
    rename: jest.fn(async (a, b) => {
      mockBabyFSStore.set(b, mockBabyFSStore.get(a));
      mockBabyFSStore.delete(a);
    }),
    opendirRecursive: jest.fn(async () => {
      return Array.from(mockBabyFSStore.keys());
    }),
  };

  IndexedDBFileSystem.mockImplementation(() => {
    return obj;
  });

  idbFS = new IndexedDBFileSystem();
});

describe('useGetWorkspaceFiles', () => {
  const App = ({ Comp }) => (
    <Router initialEntries={['/ws/kujo']}>
      <Switch>
        <Route path={['/ws/:wsName']}>
          <Workspace>
            <Comp />
          </Workspace>
        </Route>
      </Switch>
      <Route
        path="*"
        render={({ history, location }) => {
          return null;
        }}
      />
    </Router>
  );

  test('works', async () => {
    let refreshFiles;

    mockStore.set('workspaces/2', [
      {
        name: 'kujo',
        type: 'browser',
        metadata: {},
      },
    ]);
    await idbFS.writeFile('kujo/one.md', createFileContent());

    function Comp() {
      const [files, _refreshFiles] = useGetWorkspaceFiles();
      refreshFiles = _refreshFiles;
      return (
        <div data-testid="result">
          {files.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
      );
    }

    let promise = Promise.resolve();
    let result;
    act(() => {
      result = render(<App Comp={Comp} />);
    });
    // To let the initial setState settle in Workspace after mount
    await act(() => promise);

    expect(result.container).toMatchInlineSnapshot(`
      <div>
        <div
          data-testid="result"
        >
          <span>
            kujo:one.md
          </span>
        </div>
      </div>
    `);

    await idbFS.writeFile('kujo/two.md', createFileContent());

    await act(async () => {
      await refreshFiles();
    });

    expect(result.container).toMatchInlineSnapshot(`
      <div>
        <div
          data-testid="result"
        >
          <span>
            kujo:one.md
          </span>
          <span>
            kujo:two.md
          </span>
        </div>
      </div>
    `);
  });
});

describe('useWorkspacePath', () => {
  const App = ({ Comp }) => (
    <Router initialEntries={['/ws/kujo']}>
      <Switch>
        <Route path={['/ws/:wsName']}>
          <Workspace>
            <Comp />
          </Workspace>
        </Route>
      </Switch>
      <Route
        path="*"
        render={({ history, location }) => {
          return null;
        }}
      />
    </Router>
  );
  test('refreshes after workspace permissions are updated', async () => {
    let setWsPermissionState;
    mockStore.set('workspaces/2', [
      {
        name: 'kujo',
        type: 'browser',
        metadata: {},
      },
    ]);

    await idbFS.writeFile('kujo/one.md', createFileContent());

    function Comp() {
      const [files] = useGetWorkspaceFiles();
      ({ setWsPermissionState } = useWorkspacePath());
      return (
        <div data-testid="result">
          {files.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
      );
    }

    let promise = Promise.resolve();
    let result;
    act(() => {
      result = render(<App Comp={Comp} />);
    });
    // To let the initial setState settle in Workspace after mount
    await act(() => promise);

    expect(
      result.container.querySelectorAll('[data-testid="result"]'),
    ).toHaveLength(1);

    await act(async () => {
      await setWsPermissionState({
        type: 'error',
        error: new Error('some magical error'),
      });
    });

    // Should show error instead of showing our component
    expect(result.container).toMatchSnapshot();

    expect(
      result.container.querySelectorAll('[data-testid="result"]'),
    ).toHaveLength(0);

    await act(async () => {
      await setWsPermissionState({
        type: 'ready',
        workspace: await getWorkspaceInfo('kujo'),
      });
    });

    expect(
      result.container.querySelectorAll('[data-testid="result"]'),
    ).toHaveLength(1);

    expect(result.getByTestId('result')).toMatchInlineSnapshot(`
      <div
        data-testid="result"
      >
        <span>
          kujo:one.md
        </span>
      </div>
  `);
  });
});

describe('useCreateMdFile', () => {
  test('browser create file', async () => {
    let callback;
    let testLocation;

    mockStore.set('workspaces/2', [
      {
        name: 'kujo',
        type: 'browser',
        metadata: {},
      },
    ]);

    function Comp() {
      const createMdFile = useCreateMdFile();
      callback = createMdFile;
      return <div>Hello</div>;
    }

    await render(
      <Router initialEntries={['/ws/kujo']}>
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

    expect(callback).not.toBeUndefined();

    const result = callback('kujo:one.md');
    expect(result).toBeInstanceOf(Promise);

    await result;

    expect(testLocation.pathname).toBe('/ws/kujo/one.md');

    expect(idbFS.writeFile).toBeCalledTimes(1);
    expect(idbFS.writeFile).toBeCalledWith(
      'kujo/one.md',
      '# one.md\n\nHello world!',
    );
  });
});

describe('useRenameActiveFile', () => {
  test('browser rename file', async () => {
    let callback;
    let testLocation;

    mockStore.set('workspaces/2', [
      {
        name: 'kujo',
        type: 'browser',
        metadata: {},
      },
    ]);

    await idbFS.writeFile('kujo/one.md', createFileContent());

    function Comp() {
      const renameFileCb = useRenameActiveFile();
      callback = renameFileCb;
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

    expect(callback).not.toBeUndefined();

    const result = callback('two.md');
    expect(result).toBeInstanceOf(Promise);

    await result;

    expect(testLocation.pathname).toBe('/ws/kujo/two.md');

    expect(idbFS.rename).toBeCalledTimes(1);
    expect(idbFS.rename).toBeCalledWith('kujo/one.md', 'kujo/two.md');
  });
});

describe('useDeleteFile', () => {
  test('browser delete file', async () => {
    let callback;
    let testLocation;

    mockStore.set('workspaces/2', [
      {
        name: 'kujo',
        type: 'browser',
        metadata: {},
      },
    ]);

    await idbFS.writeFile('kujo/one.md', createFileContent());

    function Comp() {
      const deleteFileCb = useDeleteFile();
      callback = deleteFileCb;
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

    expect(callback).not.toBeUndefined();

    const result = callback('kujo:one.md');
    expect(result).toBeInstanceOf(Promise);

    await result;

    expect(testLocation.pathname).toBe('/ws/kujo');

    expect(idbFS.unlink).toBeCalledTimes(1);
    expect(idbFS.unlink).toBeCalledWith('kujo/one.md');
  });
});

describe('useWorkspaces', () => {
  test('createWorkspace', async () => {
    mockStore.clear();
    let createWorkspace, testLocation;

    function CompCreateWS() {
      const r = useWorkspaces();
      createWorkspace = r.createWorkspace;
      return <div>Hello</div>;
    }

    act(() => {
      render(
        <Router initialEntries={['/ws']}>
          <Switch>
            <Route path="/ws">
              <CompCreateWS />
            </Route>
            <Route exact path="/ws/:wsName">
              <CompCreateWS />
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
    });

    await act(() => createWorkspace('kujo1'));

    expect(testLocation.pathname).toBe('/ws/kujo1');
    // Note: for some reason MemoryRouter doesnt do urlParams
    // correctly
    expect(idb.set).toBeCalledWith('workspaces/2', [
      { metadata: {}, name: 'kujo1', type: 'browser' },
    ]);
  });
});
