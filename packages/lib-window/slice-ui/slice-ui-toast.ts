import { cleanup, createKey, EffectStore, ref, Store } from '@nalanda/core';

import { DiscriminatedEmitter, Emitter } from '@bangle.io/emitter';
import { ToastRequest, ToastRequestClear } from '@bangle.io/shared-types';

const key = createKey('slice-ui-toast', []);

const getToastEmitterRef = ref<
  DiscriminatedEmitter<
    | {
        event: 'toast-request';
        payload: ToastRequest;
      }
    | {
        event: 'toast-clear';
        payload: ToastRequestClear;
      }
    | {
        event: 'toast-clear-all';
        payload: {
          clear: 'all';
        };
      }
  >
>(() => Emitter.create());

key.effect((store) => {
  const toastEmitter = getToastEmitter(store);

  cleanup(store, () => {
    toastEmitter.destroy();
  });
});

export const sliceUIToast = key.slice({});

export function queueToast(
  store: Store<any> | EffectStore<any>,
  toastRequest: ToastRequest,
) {
  const toastRef = getToastEmitterRef(store).current;
  toastRef.emit('toast-request', toastRequest);
}

export function clearToast(
  store: Store<any> | EffectStore<any>,
  toastRequest: ToastRequestClear,
) {
  const toastRef = getToastEmitterRef(store).current;
  toastRef.emit('toast-clear', toastRequest);
}

export function clearAllToast(store: Store<any> | EffectStore<any>) {
  const toastRef = getToastEmitterRef(store).current;
  toastRef.emit('toast-clear-all', { clear: 'all' });
}

export function getToastEmitter(store: Store<any> | EffectStore<any>) {
  return getToastEmitterRef(store).current;
}
