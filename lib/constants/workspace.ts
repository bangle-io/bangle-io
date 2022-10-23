export const WorkspaceTypeHelp = 'helpfs';
export const WorkspaceTypeNative = 'nativefs';
export const WorkspaceTypeBrowser = 'browser';
// See https://webkit.org/blog/12257/the-file-system-access-api-with-origin-private-file-system/
// is supported by Safari and Chrome. It is similar to nativefs in API (not verified, there might be differences)
// but provides a private directory to each origin.
export const WorkspaceTypePrivateFileSystem = 'privatefs';
