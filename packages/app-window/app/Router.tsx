import { useStore, useTrackField } from '@nalanda/react';
import type { Key } from 'path-to-regexp';
import { pathToRegexp } from 'path-to-regexp';
import React, { useEffect } from 'react';
import type { BaseLocationHook } from 'wouter';
import { Router as WouterRouter } from 'wouter';
// eslint-disable-next-line import/default
import makeMatcher from 'wouter/matcher';

import { BaseHistory, createTo } from '@bangle.io/history';
import { getHistoryRef, slicePage } from '@bangle.io/slice-page';

const useRouterHook: BaseLocationHook = function useRouterHook() {
  const store = useStore();
  const historyLoaded = useTrackField(slicePage, 'historyLoaded');

  // history loaded guides us that the instance is ready
  const historyInstance = getHistoryRef(store).current!;
  const location = useTrackField(slicePage, 'location');

  const to =
    historyLoaded && location ? createTo(location, historyInstance) || '' : '';
  const pendingCalls = React.useRef<Parameters<BaseHistory['navigate']>[]>([]);

  const navigate = historyLoaded
    ? historyInstance.navigate.bind(historyInstance)
    : (...args: Parameters<BaseHistory['navigate']>) => {
        pendingCalls.current.push(args);
      };

  // apply any navigation calls that we might have missed during the
  // state loading
  if (pendingCalls.current.length > 0 && historyInstance) {
    for (const call of pendingCalls.current) {
      navigate(...call);
    }
    pendingCalls.current = [];
  }

  React.useEffect(() => {
    pendingCalls.current = [];
  }, []);

  return [to, navigate];
};

export const pathMatcher = makeMatcher(convertPathToRegexp);

export function Router({ children }: { children: React.ReactNode }) {
  return (
    <WouterRouter hook={useRouterHook} matcher={pathMatcher as any}>
      {children}
    </WouterRouter>
  );
}

function convertPathToRegexp(path: string) {
  let keys: Key[] = [];
  // we use original pathToRegexp package here with keys
  const regexp = pathToRegexp(path, keys, { strict: true, end: false });

  return { keys, regexp };
}
