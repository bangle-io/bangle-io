import './style.css';

import React from 'react';
import { Redirect, Route, Switch } from 'wouter';

import { WsPagesRoot } from '@bangle.io/constants';

import PageWsName from './pages/ws/_name';
import PageWorkspaceSelectionPage from './pages/ws-select';

export function MainContent() {
  return (
    <Switch>
      <Route path={`/${WsPagesRoot.WorkspaceHome}/:wsName`}>
        <PageWsName />
      </Route>
      <Route path={`/${WsPagesRoot.WorkspacesSelection}`}>
        <PageWorkspaceSelectionPage />
      </Route>
      <Route path="/">
        <Redirect to={`/${WsPagesRoot.WorkspacesSelection}`} />
      </Route>
    </Switch>
  );
}
