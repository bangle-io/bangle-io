import type { CollabServerState } from '@bangle.dev/collab-server';

import type { ApplicationStore } from '@bangle.io/create-store';
import { Slice, SliceKey } from '@bangle.io/create-store';
import { blockReload, pageSliceKey } from '@bangle.io/slice-page';
import { writeNote } from '@bangle.io/slice-workspace';

import type { NaukarStateConfig } from '../common';
import type { DocChangeObj } from '../doc-change-emitter';

type CollabStateQueue = Array<{
  wsPath: string;
  collabState: CollabServerState;
}>;
const writeNoteToDiskSliceKey = new SliceKey<{
  collabStateQueue: CollabStateQueue;
}>('write-note-to-disk-key');

export function writeNoteToDiskSlice() {
  return new Slice({
    key: writeNoteToDiskSliceKey,
    state: {
      init() {
        return { collabStateQueue: [] };
      },
    },

    sideEffect: [
      writeNoteToDiskSliceKey.effect((_, config: NaukarStateConfig) => {
        let queueInProgress = false;

        const workOnQueue = async (
          collabStateQueue: CollabStateQueue,
          store: ApplicationStore,
        ) => {
          if (queueInProgress) {
            return;
          }

          blockReload(true)(
            store.state,
            pageSliceKey.getDispatch(store.dispatch),
          );
          queueInProgress = true;

          while (collabStateQueue.length > 0) {
            const item = collabStateQueue.shift();

            if (!item) {
              continue;
            }
            try {
              await writeNote(item.wsPath, item.collabState.doc)(
                store.state,
                store.dispatch,
                store,
              );
            } catch (error) {
              if (error instanceof Error) {
                console.log(
                  'received error while writting item',
                  error.message,
                );
                store.errorHandler(error);
              }
            }
          }
          blockReload(false)(
            store.state,
            pageSliceKey.getDispatch(store.dispatch),
          );
          queueInProgress = false;
        };

        return {
          deferredOnce(store, abortSignal) {
            const listener = ({ wsPath, newCollabState }: DocChangeObj) => {
              const { collabStateQueue } =
                writeNoteToDiskSliceKey.getSliceStateAsserted(store.state);

              const existing = collabStateQueue.find(
                (item) => item.wsPath === wsPath,
              );

              if (existing) {
                console.log('Existing item found, updating', wsPath);
                existing.collabState = newCollabState;
              } else {
                collabStateQueue.push({ wsPath, collabState: newCollabState });
              }
              workOnQueue(collabStateQueue, store);
            };
            // TODO there is a risk event firing before `deferredOnce` is called
            // and losing a save operation.
            config.docChangeEmitter.addListener(listener);

            abortSignal.addEventListener(
              'abort',
              () => {
                config.docChangeEmitter.removeListener(listener);
              },
              { once: true },
            );
          },
        };
      }),
      // TODO implement the case when disk changes behind the scenes and we need to reload
      // or ask user to duplicate the current doc.
      // writeNoteToDiskSliceKey.effect((_, config: NaukarStateConfig) => {
      //   (state, config) => {
      //     assertNotUndefined(
      //       config.extensionRegistry,
      //       'extensionRegistry needs to be defined',
      //     );

      //     return {
      //       update(store, prevState) {
      //         if (pageLifeCycleTransitionedTo('active', prevState)(store.state)) {
      //           editorManagerReset(config.extensionRegistry, config.docChangeEmitter)(
      //             store.state,
      //             store.dispatch,
      //             store,
      //           );

      //           return;
      //         }

      //         const pageTransitionedToInactive = pageLifeCycleTransitionedTo(
      //           ['passive', 'terminated', 'frozen', 'hidden'],
      //           prevState,
      //         )(store.state);

      //         if (pageTransitionedToInactive) {
      //           // diskFlushAll()(store.state, store.dispatch);

      //           return;
      //         }
      //       },
      //     };
      //   },
      // }),
    ],
  });
}
