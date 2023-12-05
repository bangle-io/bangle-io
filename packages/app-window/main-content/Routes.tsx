import './style.css';

import React from 'react';
import { Redirect, Route, Switch } from 'wouter';

import PageWsName from './pages/ws/_name';
import PageWorkspaceSelectionPage from './pages/ws-select';

export function MainContent() {
  return (
    <Switch>
      <Route path={`/ws/:wsName`}>
        <PageWsName />
      </Route>
      <Route path={`/ws-select`}>
        <PageWorkspaceSelectionPage />
      </Route>
      <Route path="/">
        <Redirect to={`/ws-select`} />
      </Route>
    </Switch>
  );
}
