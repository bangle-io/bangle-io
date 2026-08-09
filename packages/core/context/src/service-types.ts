import type { BaseService } from '@bangle.io/base-utils';
import type {
  CommandDispatchService,
  CommandRegistryService,
  EditorService,
  FileSystemService,
  NavigationService,
  NoteRelocationService,
  NoteSnapshotService,
  ShortcutService,
  UserActivityService,
  WorkbenchStateService,
  WorkspaceOpsService,
  WorkspaceStateService,
} from '@bangle.io/service-core';
import type { CommandExcludedServiceSlotId } from '@bangle.io/types';
import type { Atom } from 'jotai';

export type {
  NoteSnapshotMetadata,
  NoteSnapshotRecord,
} from '@bangle.io/service-core';

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
  /**
   * wsPaths whose stored Markdown does not survive this engine's
   * parse/serialize round trip, so saving an edit reformats content the user
   * never touched. The title bar surfaces a quiet fidelity notice for the open
   * note. An engine that always preserves Markdown exposes an always-empty set.
   */
  readonly $roundTripWarnings: Atom<ReadonlySet<string>>;
  /**
   * Captures the active editor and selection for a later Markdown insertion.
   * The returned function refuses to insert if the editor, document, or
   * selection changes before it runs, so asynchronous clipboard access cannot
   * retarget content into another note or range.
   */
  captureMarkdownInsertion: () => ((markdownText: string) => boolean) | null;
  collapseAllHeadings: (level: number) => boolean;
  focusEditor: () => void;
  getSelectionMarkdown: () => string | null;
  hasPendingOrFailedSave: (wsPath?: string) => boolean;
  /**
   * Parses and inserts Markdown at the current selection. Returns false when
   * parsing would drop content the user can see. Normalization is accepted:
   * `*italic*` arriving as `_italic_` loses nothing, and the same rewriting
   * happens to Markdown the user simply types.
   */
  insertMarkdownAtSelection: (markdownText: string) => boolean;
  /** Reports whether an app-level editor action can run against the current
   * active editor and selection. Callers must still revalidate on execution. */
  isActionAvailable: (action: EditorAction) => boolean;
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
  /** Retries one failed save, or every failed save when no path is given. */
  retryFailedSave: (wsPath?: string) => boolean;
  subscribeToSaveStatus: (listener: () => void, wsPath?: string) => () => void;
  toggleHeadingCollapse: () => boolean;
  uncollapseAllHeadings: () => boolean;
};

export type EditorAction =
  | { type: 'insert-table' }
  | { type: 'toggle-heading'; level: 1 | 2 | 3 };

export type CoreServices<
  TEditorEngine extends EditorEngineContract = EditorEngineContract,
> = {
  commandDispatcher: CommandDispatchService;
  commandRegistry: CommandRegistryService;
  editorEngine: TEditorEngine;
  editorService: EditorService;
  fileSystem: FileSystemService;
  navigation: NavigationService;
  noteRelocation: NoteRelocationService;
  noteSnapshot: NoteSnapshotService;
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
