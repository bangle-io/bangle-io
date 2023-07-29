import type { NaukarMainAPI } from '@bangle.io/shared-types';
import { assertNotUndefined } from '@bangle.io/utils';

let _mainApi: NaukarMainAPI | undefined = undefined;

export function mainApi(): NaukarMainAPI {
  assertNotUndefined(_mainApi, 'mainApi not registered');

  return _mainApi;
}

export function registerMainApi(api: NaukarMainAPI, abortSignal: AbortSignal) {
  if (_mainApi) {
    throw new Error('mainApi already registered');
  }

  console.debug('[naukar] mainApi registered');

  _mainApi = api;

  abortSignal.addEventListener(
    'abort',
    () => {
      _mainApi = undefined;
    },
    {
      once: true,
    },
  );
}
