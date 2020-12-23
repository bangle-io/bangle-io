import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import { IndexDbWorkspace } from 'bangle-play/app/workspace/workspace';
import { IndexDbWorkspaceFile } from 'bangle-play/app/workspace/workspace-file';

import localforage from 'localforage';
import {
  workspaceActions,
  WorkspaceContext,
  WorkspaceContextProvider,
} from '../WorkspaceContext';
import { sleep } from '@bangle.dev/core/utils/js-utils';
import { INDEXDB_TYPE } from 'bangle-play/app/workspace/type-helpers';
import { SpecRegistry } from '@bangle.dev/core/spec-registry';

jest.mock('localforage', () => {
  const instance = {
    iterate: jest.fn(async () => {}),
    setItem: jest.fn(async () => {}),
    removeItem: jest.fn(async () => {}),
    getItem: jest.fn(async () => {}),
  };
  const workspacesInstance = {
    iterate: jest.fn(async () => {}),
    setItem: jest.fn(async () => {}),
    removeItem: jest.fn(async () => {}),
    getItem: jest.fn(async () => {}),
  };
  return {
    config: jest.fn(),
    createInstance: jest.fn(({ name } = {}) => {
      if (name === 'workspaces/1') {
        return workspacesInstance;
      }
      return instance;
    }),
  };
});
const DateNowBackup = jest.fn();

describe('index db workspace', () => {
  let dbInstance;
  const schema = new SpecRegistry().schema;
  beforeEach(async () => {
    Date.now = jest.fn(() => 1);
    dbInstance = localforage.createInstance();
    dbInstance.getItem = jest.fn(async (docName) => ({ docName, doc: null }));
    dbInstance.iterate.mockImplementationOnce(async (cb) => {
      Array.from({ length: 5 }, (_, k) =>
        cb(
          {
            docName: k + '',
            doc: null,
          },
          k + '',
          k,
        ),
      );
    });
  });
  afterEach(() => {
    Date.now = DateNowBackup;
  });
  test('Creates workspace correctly', async () => {
    await IndexDbWorkspace.createWorkspace('test_db', schema, INDEXDB_TYPE);
  });

  test('Adds files correctly', async () => {
    const workspace = await IndexDbWorkspace.createWorkspace(
      'test_db',
      schema,
      INDEXDB_TYPE,
    );

    expect(workspace.files).toMatchSnapshot();
  });

  test('getFile', async () => {
    const workspace = await IndexDbWorkspace.createWorkspace(
      'test_db',
      schema,
      INDEXDB_TYPE,
    );

    expect(workspace.getFile('1')).toMatchInlineSnapshot(`
      Object {
        "doc": null,
        "docName": "1",
        "metadata": Object {
          "lastModified": 1,
        },
      }
    `);
  });

  test('hasFile', async () => {
    const workspace = await IndexDbWorkspace.createWorkspace(
      'test_db',
      schema,
      INDEXDB_TYPE,
    );

    expect(workspace.hasFile('2')).toBe(true);
  });

  test('link file', async () => {
    const workspace = await IndexDbWorkspace.createWorkspace(
      'test_db',
      schema,
      INDEXDB_TYPE,
    );

    const newFile = new IndexDbWorkspaceFile(
      'test_doc',
      null,
      {},
      { dbInstance: dbInstance, schema: schema },
    );

    let newWorkspace = workspace.linkFile(newFile);
    expect(workspace.hasFile('test_doc')).toBe(false);
    expect(newWorkspace.hasFile('test_doc')).toBe(true);
  });

  test('unlink file', async () => {
    const workspace = await IndexDbWorkspace.createWorkspace(
      'test_db',
      schema,
      INDEXDB_TYPE,
    );

    let newWorkspace = workspace.unlinkFile(workspace.getFile('2'));

    expect(workspace.hasFile('2')).toBe(true);
    expect(newWorkspace.hasFile('2')).toBe(false);
  });
});

describe('workspaceContext actions', () => {
  let dbInstance;
  let workspaceInstance;
  const customRender = (child, { ...renderOptions } = {}) => {
    return render(
      <WorkspaceContextProvider>{child}</WorkspaceContextProvider>,
      renderOptions,
    );
  };

  beforeEach(async () => {});
  afterEach(() => {
    Date.now = DateNowBackup;
  });

  beforeEach(async () => {
    Date.now = jest.fn(() => 1);
    dbInstance = localforage.createInstance();
    workspaceInstance = localforage.createInstance({ name: 'workspaces/1' });
    dbInstance.getItem = jest.fn(async (docName) => ({ docName, doc: null }));
    dbInstance.iterate.mockImplementation(async (cb) => {
      Array.from({ length: 5 }, (_, k) =>
        cb(
          {
            docName: k + '',
            doc: null,
          },
          k + '',
          k,
        ),
      );
    });
  });

  test('onMountWorkspaceLoad no existing workspaceInfo', async () => {
    workspaceInstance.getItem.mockImplementation(() => undefined);
    customRender(
      <WorkspaceContext.Consumer>
        {({ workspace }) =>
          workspace && (
            <span data-testid="result">
              Result: {workspace.files.map((f) => f.docName)}
            </span>
          )
        }
      </WorkspaceContext.Consumer>,
    );

    await waitFor(() => screen.getByTestId('result'));

    expect(screen.getByTestId('result').textContent).toMatchInlineSnapshot(
      `"Result: 01234"`,
    );
    expect(dbInstance.getItem).toBeCalledTimes(5);
  });

  test('onMountWorkspaceLoad when there is existing workspaceInfo', async () => {
    const name = 'test1';
    workspaceInstance.getItem.mockImplementation(async () => ({
      indexdb_abc1: {
        metadata: {},
        uid: 'indexdb_abc1',
        name,
      },
    }));
    customRender(
      <WorkspaceContext.Consumer>
        {({ workspace }) =>
          workspace && (
            <span data-testid="result">
              Result: {workspace.name} {workspace.files.map((f) => f.docName)}
            </span>
          )
        }
      </WorkspaceContext.Consumer>,
    );

    await waitFor(() => screen.getByTestId('result'));

    expect(screen.getByTestId('result').textContent).toEqual(
      `Result: ${name} 01234`,
    );
    expect(dbInstance.getItem).toBeCalledTimes(5);
  });

  test('takeWorkspaceBackup', async () => {
    const fixture = await import('./backup-fixture.json');
    let _updateContext;
    customRender(
      <WorkspaceContext.Consumer>
        {({ workspace, openedDocuments, updateContext } = {}) => {
          if (!workspace) {
            return;
          }
          _updateContext = updateContext;
          return (
            <>
              <span data-testid="result">
                Result: {workspace.name} {workspace.files.map((f) => f.docName)}
              </span>
              <span data-testid="result2">
                {workspace.files.map((f, key) => (
                  <span key={key}>{f.title}</span>
                ))}
              </span>
            </>
          );
        }}
      </WorkspaceContext.Consumer>,
    );

    await waitFor(() => screen.getByTestId('result'));

    dbInstance.getItem.mockImplementation(() => undefined);

    await _updateContext(
      workspaceActions.newWorkspaceFromBackup(fixture, 'indexdb'),
    );

    await sleep(500);

    expect(screen.getByTestId('result').textContent).toEqual(
      `Result: backup-fixture fixture_doc_2fixture_doc_1`,
    );
    expect(screen.getByTestId('result2')).toMatchInlineSnapshot(`
      <span
        data-testid="result2"
      >
        <span>
          Hello
        </span>
        <span>
          I am second document
        </span>
      </span>
    `);
  });

  test('has updateContext', async () => {
    customRender(
      <WorkspaceContext.Consumer>
        {({ updateContext } = {}) =>
          updateContext && (
            <span data-testid="result">{Boolean(updateContext)}</span>
          )
        }
      </WorkspaceContext.Consumer>,
    );

    await waitFor(() => screen.getByTestId('result'));

    expect(screen.getByTestId('result')).toBeTruthy();
  });

  test('has one openedDocuments initially', async () => {
    customRender(
      <WorkspaceContext.Consumer>
        {({ workspace, openedDocuments } = {}) => {
          if (!workspace) {
            return;
          }
          expect(openedDocuments.every((r) => r.docName)).toBe(true);
          expect(openedDocuments.every((r) => r.key)).toBe(true);
          return (
            <span data-testid="result">
              {openedDocuments.map((r) => r.docName)}
            </span>
          );
        }}
      </WorkspaceContext.Consumer>,
    );

    await waitFor(() => screen.getByTestId('result'));

    expect(screen.getByTestId('result')).toMatchInlineSnapshot(`
      <span
        data-testid="result"
      >
        0
      </span>
    `);
  });

  test('openWorkspaceFile', async () => {
    let _updateContext;
    customRender(
      <WorkspaceContext.Consumer>
        {({ workspace, openedDocuments, updateContext } = {}) => {
          if (!workspace) {
            return;
          }
          _updateContext = updateContext;
          return (
            <span data-testid="result">
              {openedDocuments.map((r) => r.docName)}
            </span>
          );
        }}
      </WorkspaceContext.Consumer>,
    );

    await waitFor(() => screen.getByTestId('result'));

    await _updateContext(workspaceActions.openWorkspaceFile('2'));

    expect(screen.getByTestId('result')).toMatchInlineSnapshot(`
      <span
        data-testid="result"
      >
        2
        0
      </span>
    `);

    // opening again should work
    await _updateContext(workspaceActions.openWorkspaceFile('2'));

    expect(screen.getByTestId('result').textContent).toMatchInlineSnapshot(
      `"22"`,
    );
  });

  test('openBlankWorkspaceFile', async () => {
    let _updateContext;
    let _openedDocuments;
    let _workspace;

    dbInstance.iterate.mockImplementation(async (cb) => {
      Array.from({ length: 2 }, (_, k) =>
        cb(
          {
            docName: k + '',
            doc: null,
          },
          k + '',
          k,
        ),
      );
    });

    dbInstance.getItem = jest.fn(async (docName) => {
      // we only give out 2 files in mock iterate
      if (['0', '1'].includes(docName)) {
        return {
          docName,
          doc: null,
        };
      }
    });

    customRender(
      <WorkspaceContext.Consumer>
        {({ workspace, openedDocuments, updateContext } = {}) => {
          if (!workspace) {
            return;
          }
          _workspace = workspace;
          _updateContext = updateContext;
          _openedDocuments = openedDocuments;
          return (
            <span data-testid="result">
              {openedDocuments.map((r) => r.docName)}
            </span>
          );
        }}
      </WorkspaceContext.Consumer>,
    );

    await waitFor(() => screen.getByTestId('result'));

    await _updateContext(workspaceActions.openBlankWorkspaceFile());

    expect(_openedDocuments.length).toBe(2);
    // its a random string
    expect(typeof _openedDocuments[0].docName === 'string').toBe(true);

    expect(_workspace.hasFile(_openedDocuments[0].docName)).toBe(true);
    expect(dbInstance.setItem).toHaveBeenNthCalledWith(
      1,
      _openedDocuments[0].docName,
      expect.any(Object),
    );
  });

  test('deleteWorkspaceFile', async () => {
    let _updateContext;
    let _openedDocuments;
    let _workspace;
    customRender(
      <WorkspaceContext.Consumer>
        {({ workspace, openedDocuments, updateContext } = {}) => {
          if (!workspace) {
            return;
          }
          _workspace = workspace;
          _updateContext = updateContext;
          _openedDocuments = openedDocuments;
          return (
            <span data-testid="result">
              {openedDocuments.map((r) => r.docName)}
            </span>
          );
        }}
      </WorkspaceContext.Consumer>,
    );

    await waitFor(() => screen.getByTestId('result'));

    await _updateContext(workspaceActions.openWorkspaceFile('2'));
    expect(_openedDocuments[0].docName).toBe('2');

    await _updateContext(workspaceActions.deleteWorkspaceFile('2'));

    expect(_openedDocuments.length).toBe(1);
    // its a random string
    expect(_openedDocuments[0].docName).toBe('0');

    expect(_workspace.hasFile(_openedDocuments[0].docName)).toBe(true);
    expect(dbInstance.removeItem).toBeCalledTimes(1);
    expect(dbInstance.removeItem).toHaveBeenNthCalledWith(1, '2');
  });
});

test.todo('Be able to delete a pending workspace');

describe('restore native-fs', () => {
  test.todo('take a backup');
  test.todo('Be able to restore to a folder with already existing files');
  test.todo(
    'Be able to restore to a folder with already existing files and has a name conflict',
  );

  test.todo('Have multiple workspaces pointing to same directory');
  test.todo(
    'Have multiple workspaces  of which one directory is a child or the other workspace',
  );

  test.todo('Handle the case when the directory backing workspace is deleted');
});
