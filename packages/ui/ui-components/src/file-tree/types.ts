import type { Action } from '../types';

export type FileTreeEntryKind = 'directory' | 'file';

export interface FileTreeEntry {
  kind: FileTreeEntryKind;
  path: string;
}

interface FileTreeEntryActionContext {
  entry: FileTreeEntry;
  selectedEntries: readonly FileTreeEntry[];
}

export type FileTreeEntryAction = Action<FileTreeEntryActionContext>;

export function normalizePierreDirectoryPath(path: string): string {
  return path.replace(/\/+$/, '');
}

export function normalizePierreFilePath(path: string): string {
  return normalizePierreDirectoryPath(path);
}
