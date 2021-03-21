import React from 'react';
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom';
import {
  useCreateMdFile,
  useDeleteFile,
  useRenameActiveFile,
  useWorkspaces,
} from '../workspace-hooks';
import { render, act } from '@testing-library/react';
import * as idb from 'idb-keyval';

const mockStore = new Map();

jest.mock('idb-keyval', () => {
  const idb = {};
  idb.get = jest.fn((...args) => {
    return mockStore.get(...args);
  });
  idb.del = jest.fn((...args) => {
    return mockStore.delete(...args);
  });
  idb.set = jest.fn((...args) => {
    return mockStore.set(...args);
  });
  idb.keys = jest.fn((...args) => {
    return Array.from(mockStore.keys(...args));
  });
  return idb;
});

function createFileContent(textContent = 'hello') {
  return {
    content: [
      {
        content: [{ text: textContent, type: 'text' }],
        type: 'paragraph',
      },
    ],
    type: 'doc',
  };
}

beforeEach(() => {
  mockStore.clear();
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

    expect(idb.set).toBeCalledTimes(1);
    expect(idb.set).toBeCalledWith('kujo:one.md', {
      doc: {
        content: [
          {
            attrs: {
              level: 1,

              collapseContent: null,
            },
            content: [{ text: 'one.md', type: 'text' }],
            type: 'heading',
          },
          {
            content: [{ text: 'Hello world!', type: 'text' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
      },
    });
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

    mockStore.set('kujo:one.md', {
      doc: createFileContent(),
    });

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

    expect(idb.set).toBeCalledTimes(1);
    expect(idb.set).toBeCalledWith('kujo:two.md', {
      doc: {
        content: [
          {
            content: [{ text: 'hello', type: 'text' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
      },
    });
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

    mockStore.set('kujo:one.md', {
      doc: createFileContent(),
    });

    function Comp() {
      const deleteFileCb = useDeleteFile();
      callback = deleteFileCb;
      return <div>Hello</div>;
    }

    console.log({ zz: idb.get('workspaces/2') });

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

    expect(idb.set).toBeCalledTimes(0);
    expect(idb.del).toBeCalledTimes(1);
    expect(idb.del).toBeCalledWith('kujo:one.md');
  });
});

describe('useWorkspaces', () => {
  test('createWorkspace', async () => {
    mockStore.clear();
    const promise = Promise.resolve();
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

    await createWorkspace('kujo1');
    await act(() => promise);

    expect(testLocation.pathname).toBe('/ws/kujo1');
    // Note: for some reason MemoryRouter doesnt do urlParams
    // correctly
    expect(idb.set).toBeCalledWith('workspaces/2', [
      { metadata: {}, name: 'kujo1', type: 'browser' },
    ]);
  });
});
