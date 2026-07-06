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

export interface SelectionOpenDecisionInput {
  /** The path the tree reports as newly selected (already normalized). */
  selectedPath: string | undefined;
  /** The file path the active route currently points at, or null. */
  activeRoutePath: string | null;
  /** Whether the selected path is a real file present in the tree. */
  isKnownFilePath: boolean;
}

/**
 * Decide whether a file-tree selection change should open the file (i.e.
 * trigger navigation).
 *
 * The tree re-selects the active file whenever the route changes from outside
 * the tree — browser back/forward, in-note links, and command navigation all
 * flow back in through `activePaths`, which programmatically re-selects the
 * matching row. Reporting that echoed selection as a user "open" makes the app
 * navigate to the location it is already at, which pushes a duplicate history
 * entry and destroys the forward stack. A selection that already matches the
 * active route is therefore never an open — only a selection that diverges from
 * the route reflects genuine user intent.
 */
export function shouldOpenSelectedFile({
  selectedPath,
  activeRoutePath,
  isKnownFilePath,
}: SelectionOpenDecisionInput): boolean {
  if (!selectedPath || !isKnownFilePath) {
    return false;
  }
  return selectedPath !== activeRoutePath;
}
