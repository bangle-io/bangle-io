export { calculateGitFileSha } from './calculate-git-file-sha';
export type { ErrorCodeType } from './errors';
export * as ErrorCode from './errors';
export { fileSync } from './file-sync';
export type { PlainObjEntry } from './local-file-entry-manager';
export {
  LocalFileEntry,
  LocalFileEntryManager,
  RemoteFileEntry,
} from './local-file-entry-manager';
export { fileToBase64 } from './read-file-as-text';
