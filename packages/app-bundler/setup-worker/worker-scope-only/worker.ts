import * as Comlink from 'comlink';

import { Emitter } from '@bangle.io/emitter';
import { assertWorkerGlobalScope } from '@bangle.io/global-scope-helpers';
import { Naukar } from '@bangle.io/naukar';
import { setupEternalVarsWorker } from '@bangle.io/setup-eternal-vars/worker';
import { NaukarBare } from '@bangle.io/shared-types';

import type { NaukarInitialize } from '../types';

assertWorkerGlobalScope();

Comlink.expose(setupNaukar());

// to ensure that NaukarBare is a subset of Record<string, (...args:any[])=>any>
() => {
  let x: NaukarBare = {} as NaukarBare satisfies Record<
    string,
    (...args: any[]) => any
  >;
};

function setupNaukar(): NaukarInitialize & NaukarBare {
  const emitter = new Emitter<void>();
  let ready = false;
  let naukarInstance: Naukar | undefined;

  const onReady = new Promise<void>((resolve) => {
    emitter.on('ready', () => {
      ready = true;
      resolve();
    });
  });

  const naukarInitialize: NaukarInitialize = {
    initialize: async (config) => {
      const { debugFlags } = config;
      const eternalVars = setupEternalVarsWorker({
        debugFlag,
        type: 'worker',
      });

      naukarInstance = new Naukar({
        eternalVars,
      });

      const { testDelayWorkerInitialize } = debugFlags;

      if (typeof testDelayWorkerInitialize === 'number') {
        console.warn(
          'test: delaying worker setup by',
          testDelayWorkerInitialize,
        );
        setTimeout(() => {
          emitter.emit('ready');
        }, testDelayWorkerInitialize);
      } else {
        emitter.emit('ready');
      }
    },
    isReady: async () => {
      if (ready) {
        return true;
      }
      await onReady;
      return true;
    },
  };

  const allowedKeys = new Set(Object.keys(naukarInitialize));

  const result: any = new Proxy(naukarInitialize, {
    get(target, prop, receiver) {
      if (allowedKeys.has(prop as string)) {
        return Reflect.get(target, prop, receiver);
      }

      if (ready) {
        return Reflect.get(naukarInstance!, prop, receiver);
      }

      // we have checks to ensure that naukarInstance has only methods -- (..args:any)=>any
      return (...args: any[]) => {
        return onReady.then(() => {
          return Reflect.get(naukarInstance!, prop, receiver)(...args);
        });
      };
    },
  });

  return result;
}
