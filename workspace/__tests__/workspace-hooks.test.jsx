import mockBabyFs from './baby-fs.mock';

import { render, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom';
import * as idb from 'idb-keyval';
import { checkWidescreen } from 'utils/index';
import { BangleIOContext } from 'bangle-io-context/index';
import { defaultSpecs } from '@bangle.dev/core/test-helpers/default-components';
import { Workspace } from '../Workspace';
import {
  useCreateNote,
  useDeleteFile,
  useListCachedNoteWsPaths,
  useWorkspacePath,
  useWorkspaces,
} from '../workspace-hooks';
import { helpFSWorkspaceInfo } from 'config/help-fs';

jest.mock('utils/index', () => {
  const actual = jest.requireActual('utils/index');

  return {
    ...actual,
    checkWidescreen: jest.fn(() => false),
  };
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

const originalFile = window.File;

beforeEach(() => {
  window.File = class File {
    constructor(content, fileName, opts) {
      this.content = content;
      this.fileName = fileName;
      this.opts = opts;
    }
  };
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

    mockBabyFs.setupMockWorkspace({ name: 'kujo' });

    await mockBabyFs.setupMockFile('kujo', 'one.md');

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

    await mockBabyFs.idbFS.writeFile('kujo/two.md', createFileContent());
    await mockBabyFs.setupMockFile('kujo', 'two.md');

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
    mockBabyFs.setupMockWorkspace({ name: 'kujo' });
    await mockBabyFs.setupMockFile('kujo', 'one.md');
    await mockBabyFs.setupMockFile('kujo', 'two.png');
    await mockBabyFs.setupMockFile('kujo', 'three.md');

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
    mockBabyFs.setupMockWorkspace({ name: 'kujo' });

    await mockBabyFs.setupMockFile('kujo', 'one.md');

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

    mockBabyFs.setupMockWorkspace({ name: 'kujo' });

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

    expect(mockBabyFs.idbFS.writeFile).toBeCalledTimes(1);
    expect(mockBabyFs.idbFS.writeFile).toBeCalledWith(
      'kujo/one.md',
      new File(['# one\n\nHello world!'], 'one.md', { type: 'text/plain' }),
    );
  });
});

describe('useDeleteFile', () => {
  test('browser delete file', async () => {
    let callback;
    let testLocation;

    mockBabyFs.setupMockWorkspace({ name: 'kujo' });

    await mockBabyFs.setupMockFile('kujo', 'one.md');

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

    expect(mockBabyFs.idbFS.unlink).toBeCalledTimes(1);
    expect(mockBabyFs.idbFS.unlink).toBeCalledWith('kujo/one.md');
  });
});

describe('useWorkspaces', () => {
  test('loads workspace on mount', async () => {
    mockBabyFs.mockStore.clear();
    let createWorkspace, testLocation;
    mockBabyFs.setupMockWorkspace({ name: 'kujo1' });

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
          bangle-help
        </div>
      </div>
    `);
  });

  test('createWorkspace', async () => {
    mockBabyFs.mockStore.clear();
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
      helpFSWorkspaceInfo,
      { metadata: {}, name: 'kujo1', type: 'browser' },
    ]);
  });
});
