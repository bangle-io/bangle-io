import './style.css';

import React from 'react';
import { Redirect, Route, Switch } from 'wouter';

import PageWsName from './pages/ws/_name';
import PageWsHomePage from './pages/ws-homepage';

export function MainContent() {
  return (
    <Switch>
      <Route path="/ws/:wsName">
        <PageWsName />
      </Route>
      <Route path="/ws-homepage">
        <PageWsHomePage />
      </Route>
      <Route path="/">
        <Redirect to="/ws-homepage" />
      </Route>
    </Switch>
  );
}
