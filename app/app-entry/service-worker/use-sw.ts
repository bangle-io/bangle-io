/// <reference types="vite-plugin-pwa/client" />

import { useCallback, useState } from 'react';
// eslint-disable-next-line
import { registerSW } from 'virtual:pwa-register';

import { SERVICE_WORKER_UPDATE_INTERVAL } from '@bangle.io/config';

const LOG = false;
const log = LOG ? console.log.bind(console, 'use-sw') : () => {};

let intervalRef: any;
export function useRegisterSW() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  log({ needRefresh, offlineReady });

  const [updateServiceWorker] = useState(
    (): ((reloadPage?: boolean) => void) => {
      return registerSW({
        immediate: true,
        onOfflineReady() {
          log('setting offline ready');
          setOfflineReady(true);
        },
        onNeedRefresh() {
          log('setting need refresh');

          setNeedRefresh(true);
        },
        onRegisterError(error: any) {
          throw new Error(error);
        },
        onRegistered(r: ServiceWorkerRegistration | undefined) {
          log('on registered');

          if (intervalRef) {
            clearInterval(intervalRef);
            intervalRef = null;
          }
          if (r) {
            intervalRef = setInterval(async () => {
              log('Checking for sw update');
              await r.update();
            }, SERVICE_WORKER_UPDATE_INTERVAL);
          }
        },
      });
    },
  );

  const closePrompt = useCallback(() => {
    setOfflineReady(false);
    setNeedRefresh(false);
  }, []);

  const acceptPrompt = useCallback(() => {
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  return {
    acceptPrompt,
    closePrompt,
    needRefresh,
    offlineReady,
  };
}
