import type { NaukarMainAPI } from '@bangle.io/shared-types';

let _mainApi: NaukarMainAPI | undefined = undefined;

export function mainApi(): NaukarMainAPI {
  if (!_mainApi) {
    throw new Error('mainApi not registered');
  }

  return _mainApi;
}

export function registerMainApi(api: NaukarMainAPI): void {
  if (_mainApi) {
    throw new Error('mainApi already registered');
  }

  console.debug('[naukar] mainApi registered');

  _mainApi = api;
}
