import type { BaseService } from '@bangle.io/base-utils';
import type {
  CommandDispatchService,
  CommandRegistryService,
  EditorService,
  FileSystemService,
  NavigationService,
  ShortcutService,
  UserActivityService,
  WorkbenchStateService,
  WorkspaceOpsService,
  WorkspaceStateService,
} from '@bangle.io/service-core';
import type { CommandExcludedServiceSlotId } from '@bangle.io/types';

/**
 * The engine-agnostic contract of the service powering the note editing
 * surface. Everything outside the active engine package (pages, commands,
 * save protection, error recovery) must interact with the editor only
 * through this contract, so an engine can be swapped at the composition
 * root without touching consumers (see plans/011).
 *
 * Semantics every engine must uphold:
 * - `mountEditor` is idempotent per `name` and returns a cleanup that fully
 *   releases the mount.
 * - Saves are coalesced and ordered: an older write completion must never
 *   overwrite a newer edit, and unsaved content is preserved until its
 *   durable write succeeds.
 * - A failed load never writes fallback or normalized content back to
 *   storage.
 * - `hasPendingOrFailedSave` is the source of truth for dirty-state UI and
 *   navigation save protection.
 */
export type EditorEngineContract = BaseService & {
  /** Stable engine identifier (e.g. 'prosemirror'), exposed on the mounted
   * DOM as `data-editor-engine` for tests and diagnostics. */
  readonly engineId: string;
  collapseAllHeadings: (level: number) => boolean;
  focusEditor: () => void;
  getSelectionMarkdown: () => string | null;
  hasPendingOrFailedSave: (wsPath?: string) => boolean;
  insertMarkdownAtSelection: (markdownText: string) => boolean;
  /** Inserts a starter table at the current selection in the active editor
   * and focuses its first cell. Returns false when there is no active
   * editor or the position cannot hold a table. */
  insertTable: () => boolean;
  /** Toggles the block at the current selection between a heading of the
   * given level and a paragraph. Returns false when there is no active
   * editor. */
  toggleHeading: (level: number) => boolean;
  mountEditor: (params: {
    domNode: HTMLElement;
    wsPath: string;
    name: string;
    focus?: boolean;
  }) => () => void;
  retryFailedSave: (wsPath: string) => boolean;
  subscribeToSaveStatus: (listener: () => void) => () => void;
  toggleHeadingCollapse: () => boolean;
  uncollapseAllHeadings: () => boolean;
};

export type CoreServices<
  TEditorEngine extends EditorEngineContract = EditorEngineContract,
> = {
  commandDispatcher: CommandDispatchService;
  commandRegistry: CommandRegistryService;
  editorEngine: TEditorEngine;
  editorService: EditorService;
  fileSystem: FileSystemService;
  navigation: NavigationService;
  shortcut: ShortcutService;
  userActivityService: UserActivityService;
  workbenchState: WorkbenchStateService;
  workspaceOps: WorkspaceOpsService;
  workspaceState: WorkspaceStateService;
};

export type CommandExposedServices<
  TEditorEngine extends EditorEngineContract = EditorEngineContract,
> = Omit<CoreServices<TEditorEngine>, CommandExcludedServiceSlotId>;

export type Services<
  TEditorEngine extends EditorEngineContract = EditorEngineContract,
> = {
  core: CoreServices<TEditorEngine>;
};
