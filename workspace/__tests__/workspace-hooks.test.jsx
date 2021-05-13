import { render, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom';
import {
  useCreateNote,
  useDeleteFile,
  useListCachedNoteWsPaths,
  useWorkspacePath,
  useWorkspaces,
} from '../workspace-hooks';
import * as idb from 'idb-keyval';
import { Workspace } from '../Workspace';
import { IndexedDBFileSystem } from 'baby-fs';
import { checkWidescreen } from 'utils/index';
import { BangleIOContext } from 'bangle-io-context/index';
import { defaultSpecs } from '@bangle.dev/core/test-helpers/default-components';

const mockStore = new Map();
const mockBabyFSStore = new Map();

jest.mock('baby-fs', () => {
  const actual = jest.requireActual('baby-fs');
  return {
    ...actual,
    IndexedDBFileSystem: jest.fn(),
  };
});

jest.mock('utils/index', () => {
  const actual = jest.requireActual('utils/index');

  return {
    ...actual,
    checkWidescreen: jest.fn(() => false),
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

const originalFile = window.File;

beforeEach(() => {
  mockStore.clear();
  window.File = class File {
    constructor(content, fileName, opts) {
      this.content = content;
      this.fileName = fileName;
      this.opts = opts;
    }
  };

  mockBabyFSStore.clear();
  const obj = {
    readFileAsText: jest.fn(async (fileName) => {
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

afterEach(() => {
  window.File = originalFile;
});

describe('useListCachedNoteWsPaths', () => {
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
      const [files, _refreshFiles] = useListCachedNoteWsPaths();
      refreshFiles = _refreshFiles;
      return (
        <div data-testid="result">
          {files && files.map((f) => <span key={f}>{f}</span>)}
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

  test('only returns md files', async () => {
    mockStore.set('workspaces/2', [
      {
        name: 'kujo',
        type: 'browser',
        metadata: {},
      },
    ]);
    await idbFS.writeFile('kujo/one.md', createFileContent());
    await idbFS.writeFile('kujo/two.png', createFileContent());
    await idbFS.writeFile('kujo/three.md', createFileContent());

    function Comp() {
      const [files] = useListCachedNoteWsPaths();
      return (
        <div data-testid="result">
          {files && files.map((f) => <span key={f}>{f}</span>)}
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
          <span>
            kujo:three.md
          </span>
        </div>
      </div>
    `);
  });
});

describe('useWorkspacePath', () => {
  let testLocation;
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
          testLocation = location;

          return null;
        }}
      />
    </Router>
  );

  beforeEach(() => {
    testLocation = null;
  });

  test('pushWsPath works', async () => {
    // to get secondary tested
    checkWidescreen.mockImplementation(() => true);

    let workspacePathHookResult;
    mockStore.set('workspaces/2', [
      {
        name: 'kujo',
        type: 'browser',
        metadata: {},
      },
    ]);

    await idbFS.writeFile('kujo/one.md', createFileContent());

    function Comp() {
      const [files] = useListCachedNoteWsPaths();
      workspacePathHookResult = useWorkspacePath();
      return (
        <div data-testid="result">
          {files && files.map((f) => <span key={f}>{f}</span>)}
        </div>
      );
    }

    let promise = Promise.resolve();
    let result;
    act(() => {
      result = render(<App Comp={Comp} />);
    });
    expect(workspacePathHookResult).toMatchSnapshot();

    // To let the initial setState settle in Workspace after mount
    await act(() => promise);

    expect(
      result.container.querySelectorAll('[data-testid="result"]'),
    ).toHaveLength(1);

    await act(async () => {
      await workspacePathHookResult.pushWsPath('kujo:two.md');
    });

    expect(testLocation?.pathname).toBe('/ws/kujo/two.md');
    expect(testLocation?.state).toMatchInlineSnapshot(`
      Object {
        "workspaceInfo": Object {
          "metadata": Object {},
          "name": "kujo",
          "type": "browser",
        },
        "workspaceStatus": "READY",
      }
    `);
    expect(workspacePathHookResult).toMatchSnapshot();

    await act(async () => {
      await workspacePathHookResult.removeWsPath();
    });
    expect(testLocation?.pathname).toBe('/ws/kujo');

    await act(async () => {
      await workspacePathHookResult.replaceWsPath('kujo:one.md');
    });
    expect(testLocation?.pathname).toBe('/ws/kujo/one.md');

    expect(testLocation.search).toBe('');

    await act(async () => {
      await workspacePathHookResult.pushWsPath(
        'kujo:three.md',
        undefined,
        true,
      );
    });
    expect(testLocation?.search).toBe('?secondary=kujo%3Athree.md');
    expect(testLocation?.pathname).toBe('/ws/kujo/one.md');

    await act(async () => {
      await workspacePathHookResult.removeSecondaryWsPath();
    });
    expect(testLocation?.search).toBe('');
    expect(testLocation?.pathname).toBe('/ws/kujo/one.md');
  });
});

describe('useCreateNote', () => {
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
      const createMdFile = useCreateNote();
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

    const result = callback(
      new BangleIOContext({
        coreRawSpecs: defaultSpecs(),
        markdownItPlugins: [],
      }),
      'kujo:one.md',
    );
    expect(result).toBeInstanceOf(Promise);

    await result;

    expect(testLocation.pathname).toBe('/ws/kujo/one.md');

    expect(idbFS.writeFile).toBeCalledTimes(1);
    expect(idbFS.writeFile).toBeCalledWith(
      'kujo/one.md',
      new File(['# one\n\nHello world!'], 'one.md', { type: 'text/plain' }),
    );
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
  test('loads workspace on mount', async () => {
    mockStore.clear();
    let createWorkspace, testLocation;

    idb.set('workspaces/2', [{ metadata: {}, name: 'kujo1', type: 'browser' }]);

    function CompCreateWS() {
      const { workspaces = [] } = useWorkspaces();
      return <div data-testid="result">{workspaces.map((r) => r.name)}</div>;
    }

    let result;
    act(() => {
      result = render(
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

    let promise = Promise.resolve();

    await act(() => promise);
    expect(result.container).toMatchInlineSnapshot(`
      <div>
        <div
          data-testid="result"
        >
          kujo1
        </div>
      </div>
    `);
  });

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
