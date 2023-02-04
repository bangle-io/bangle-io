import type { ReducedStore, Store } from './store';

export function waitUntil<S extends Store<any> | ReducedStore<any>>(
  store: S,
  condition: (state: S['state']) => boolean,
  waitUntil = 100,
  pollFrequency = 5,
): Promise<S['state']> {
  let interval: ReturnType<typeof setInterval> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return new Promise<S['state']>((resolve, reject) => {
    timeout = setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Timeout condition not met'));
    }, waitUntil);

    interval = setInterval(() => {
      if (condition(store.state)) {
        clearTimeout(timeout);
        clearInterval(interval);
        resolve(store.state);
      }
    }, pollFrequency);
  });
}
