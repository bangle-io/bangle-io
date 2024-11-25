import React from 'react';

import { Route, Switch } from 'wouter';
import { PageEditor } from './pages/page-editor';
import { PageNotFound } from './pages/page-not-found';
import { PageWsHome } from './pages/page-ws-home';

export function AppRoutes() {
  return (
    <Switch>
      <Route path="/ws/:wsName/*">
        <PageEditor />
      </Route>
      <Route path="/ws/:wsName">
        <PageWsHome />
      </Route>

      <Route path="/ws-not-found">
        <PageNotFound />
      </Route>

      <Route>404, Not Found!</Route>
    </Switch>
  );
}
