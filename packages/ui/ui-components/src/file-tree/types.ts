import type { Action } from '../types';

export type FileTreeEntryKind = 'directory' | 'file';

export interface FileTreeEntry {
  kind: FileTreeEntryKind;
  path: string;
}

export type FileTreeEntryAction = Action<FileTreeEntry>;

export function normalizePierreDirectoryPath(path: string): string {
  return path.replace(/\/+$/, '');
}

export function normalizePierreFilePath(path: string): string {
  return normalizePierreDirectoryPath(path);
}
