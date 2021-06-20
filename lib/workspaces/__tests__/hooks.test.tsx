import mockBabyFs from 'baby-fs-test-mock/index';
import { render, act } from '@testing-library/react';
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom';
import React from 'react';
import { useWorkspaces } from '../hooks';
import { helpFSWorkspaceInfo } from '../types';
import * as idb from 'idb-keyval';

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
