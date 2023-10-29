export enum WorkspaceType {
  Help = 'helpfs',
  NativeFS = 'nativefs',
  Browser = 'browser',
  // See https://webkit.org/blog/12257/the-file-system-access-api-with-origin-private-file-system/
  // is supported by Safari and Chrome. It is similar to nativefs in API (not verified, there might be differences)
  // but provides a private directory to each origin.
  PrivateFS = 'privatefs',
  Github = 'github-storage',
}

export const STORAGE_ON_CHANGE_EMITTER_KEY = 'storage-on-change-emitter';
