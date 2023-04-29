import { config } from '@bangle.io/config';
import * as constants from '@bangle.io/constants';
import { Slice, SliceKey } from '@bangle.io/create-store';
import type { E2ETypes } from '@bangle.io/e2e-types';
import { extensionRegistrySliceKey } from '@bangle.io/extension-registry';
import { markdownParser } from '@bangle.io/markdown';
import * as workspaceContext from '@bangle.io/slice-workspace';
import { BaseError } from '@bangle.io/utils';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

// TODO migrate to using `e2eHelpers2` instead.
export function e2eHelpers() {
  return new Slice({
    key: new SliceKey('e2eHelpers1'),
    sideEffect() {
      let e2eHelpers: { [r: string]: any } = {};

      return {
        destroy() {
          e2eHelpers = {};
        },
        deferredOnce(store, abortSignal) {
          (window as any)._e2eHelpers = e2eHelpers;

          e2eHelpers._naukarProxy = naukarProxy;

          // for e2e testing
          e2eHelpers._appStore = store;
          e2eHelpers._getWsPaths = () =>
            workspaceContext.workspaceSliceKey.getSliceState(store.state)
              ?.wsPaths;
          e2eHelpers._pushWsPath = (wsPath: string, secondary: boolean) =>
            workspaceContext.pushWsPath(
              wsPath,
              undefined,
              secondary,
            )(store.state, store.dispatch);

          e2eHelpers.e2eHealthCheck = async () => {
            assertOk(await naukarProxy.status(), 'naukarProxy.status failed');

            assertOk(
              (await naukarProxy.testHandlesBaseError(
                new BaseError({ message: 'test' }),
              )) instanceof BaseError,
              'naukarProxy.testHandlesBaseError failed',
            );
            assertOk(
              await naukarProxy.testIsWorkerEnv(),
              'naukarProxy.testIsWorkerEnv failed',
            );

            // one more status at end to make sure worker is
            // still alive
            assertOk(await naukarProxy.status(), 'naukarProxy.status failed');

            return true;
          };
        },

        update(store, prevState) {},
      };
    },
  });
}

// makes life easier by adding some helpers for e2e tests
export function e2eHelpers2() {
  return new Slice({
    key: new SliceKey('e2eHelpers2'),
    sideEffect() {
      window._newE2eHelpers2 = undefined;

      return {
        deferredOnce(store, abortSignal) {
          const e2eHelpers: E2ETypes = {
            config,
            constants,
            e2eHealthCheck: async () => {
              assertOk(await naukarProxy.status(), 'naukarProxy.status failed');

              assertOk(
                (await naukarProxy.testHandlesBaseError(
                  new BaseError({ message: 'test' }),
                )) instanceof BaseError,
                'naukarProxy.testHandlesBaseError failed',
              );
              assertOk(
                await naukarProxy.testIsWorkerEnv(),
                'naukarProxy.testIsWorkerEnv failed',
              );

              // one more status at end to make sure worker is
              // still alive
              assertOk(await naukarProxy.status(), 'naukarProxy.status failed');

              return true;
            },
            naukarProxy,
            pushWsPath: workspaceContext.pushWsPath,
            writeNote: workspaceContext.writeNote,
            store,
            workspaceSliceKey: workspaceContext.workspaceSliceKey,
            pm: {
              createNodeFromMd: (mdText: string) => {
                const extensionRegistry =
                  extensionRegistrySliceKey.getSliceStateAsserted(
                    store.state,
                  ).extensionRegistry;

                return markdownParser(
                  mdText,
                  extensionRegistry.specRegistry,
                  extensionRegistry.markdownItPlugins,
                )!;
              },
              getEditorSchema: () => {
                return extensionRegistrySliceKey.getSliceStateAsserted(
                  store.state,
                ).extensionRegistry.specRegistry.schema;
              },
              Slice,
            },
          };
          window._newE2eHelpers2 = e2eHelpers;

          abortSignal.addEventListener(
            'abort',
            () => {
              window._newE2eHelpers2 = undefined;
            },
            { once: true },
          );
        },
      };
    },
  });
}

function assertOk(value: boolean, message?: string) {
  if (!value) {
    throw new Error(message || 'assertion failed');
  }
}
