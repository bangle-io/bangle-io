import React, { useCallback } from 'react';
import { useSyncExternalStore } from 'react';
import type { BaseLocationHook } from 'wouter';
import { Router as WouterRouter } from 'wouter';
import { useCoreServices } from './service-core-context';

const useRouterHook: BaseLocationHook = function useRouterHook() {
  const coreServices = useCoreServices();

  const subscribe = useCallback(
    (callback: () => void) => {
      const unregister = coreServices.navigation.emitter.on(
        'event::router:route-update',
        callback,
      );
      return unregister;
    },
    [coreServices],
  );

  const getSnapshot = useCallback(() => {
    return coreServices.navigation.pathname;
  }, [coreServices]);

  const getSsrPath = useCallback(() => {
    return coreServices.navigation.pathname;
  }, [coreServices]);

  const path = useSyncExternalStore(subscribe, getSnapshot, getSsrPath);

  const navigate: (typeof coreServices.navigation)['go'] = useCallback(
    (to, options) => {
      coreServices.navigation.go(to, options);
    },
    [coreServices],
  );

  return [path, navigate];
};

export function RouterContext({ children }: { children: React.ReactNode }) {
  const coreServices = useCoreServices();

  return (
    <WouterRouter base={coreServices.navigation.basePath} hook={useRouterHook}>
      {children}
    </WouterRouter>
  );
}
