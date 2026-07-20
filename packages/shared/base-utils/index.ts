import type { EventSenderMetadata } from '@bangle.io/types';

export type { ErrorReporter } from '@bangle.io/logger';
export { Logger, setErrorReporter, setGlobalLogLevel } from '@bangle.io/logger';
export type {
  AllEventListener,
  Brand,
  EventListener,
  EventMessage,
  IfEquals,
  InferType,
  JsonValue,
  JsonValueSnapshotResult,
  Validator,
} from '@bangle.io/mini-js-utils';
export {
  assertIsDefined,
  BaseError,
  browserInfo,
  createEmptyArray,
  createJsonValueSnapshot,
  DuoWeakMap,
  deepMerge,
  difference,
  Emitter,
  expectType,
  getLast,
  intersect,
  isAbortError,
  isChrome,
  isDarwin,
  isFirefox,
  isJsonValue,
  isMac,
  isMobile,
  isPlainObject,
  isSafari,
  isUndefined,
  isUndefinedOrNull,
  T,
  weakCache,
  weakCacheDuo,
} from '@bangle.io/mini-js-utils';
export { BaseErrorService } from './base-error-service';
export type { BaseServiceContext } from './base-service';
export { BaseService } from './base-service';
export { cx } from './cx';
export { getGithubUrl } from './github-bug-url';
export {
  arrayEqual,
  atomStorage,
  atomWithCompare,
  createAsyncAtom,
} from './jotai';
export { checkWidescreen } from './misc';
export type { AppErrorName } from './throw-app-error';
export {
  createAppError,
  getAppErrorCause,
  handleAppError,
  isAppError,
  throwAppError,
  wrapPromiseInAppErrorHandler,
} from './throw-app-error';
export function getEventSenderMetadata({
  tag,
}: {
  tag?: undefined | string;
}): EventSenderMetadata {
  return {
    id: 'bangle-app',
    tag: tag,
  };
}
