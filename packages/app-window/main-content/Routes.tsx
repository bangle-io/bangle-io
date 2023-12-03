import './style.css';

import React from 'react';
import { Redirect, Route, Switch } from 'wouter';

import { WS_PAGES_ROOT } from '@bangle.io/constants';

import PageWsName from './pages/ws/_name';
import PageWorkspaceSelectionPage from './pages/ws-select';

export function MainContent() {
  return (
    <Switch>
      <Route path={`/${WS_PAGES_ROOT.WorkspaceHome}/:wsName`}>
        <PageWsName />
      </Route>
      <Route path={`/${WS_PAGES_ROOT.workspacesSelection}`}>
        <PageWorkspaceSelectionPage />
      </Route>
      <Route path="/">
        <Redirect to={`/${WS_PAGES_ROOT.workspacesSelection}`} />
      </Route>
    </Switch>
  );
}
