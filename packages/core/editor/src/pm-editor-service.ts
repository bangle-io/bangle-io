import {
  BaseService,
  type BaseServiceContext,
  createAppError,
  getAppErrorCause,
  isAppError,
} from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import type { EditorEngineContract } from '@bangle.io/context';
import {
  type EditorView,
  markdownLoader,
  type Schema,
  TextSelection,
} from '@bangle.io/prosemirror-plugins';
import {
  displayNameForAsset,
  type FileSystemService,
  type NavigationService,
  type StoredMarkdownAsset,
  storeWorkspaceAssetFiles,
  type WorkbenchStateService,
  type WorkspaceStateService,
} from '@bangle.io/service-core';
import type { Store } from '@bangle.io/types';
import { toast } from '@bangle.io/ui-components';
import {
  createMissingWikiLinkTarget,
  createWikiLinkIndex,
  getEmbeddableWorkspaceAssetKind,
  getInternalLinkHeading,
  normalizeStoredMarkdownLinkTarget,
  relativeMarkdownAssetHref,
  resolveInternalLink,
  resolveLocalMarkdownAsset,
  resolveWikiLinkTarget,
  resolveWorkspaceMarkdownAssetReferenceCandidates,
  type WikiLinkIndex,
  WsPath,
  workspaceRootMarkdownAssetHref,
} from '@bangle.io/ws-path';

import { atom } from 'jotai';
import type { MarkdownAssetReference } from './asset-file-plugin';
import {
  type EditorSaveCoordinator,
  EditorSaveQueue,
  type EditorSaveStatus,
} from './editor-save-queue';
import { setupExtensions } from './extensions';
import { findHeadingIndexBySlug } from './heading-slug';
import { createLocalImageNodeView } from './local-image-node-view';
import { createEditor } from './pm-setup';
import {
  getRememberedCursorPosition,
  resolveRememberedCursor,
} from './remembered-cursor';
import { isMarkdownRoundTripPreserved } from './round-trip-check';

const ASSET_TOAST_FILE_NAME_MAX_LENGTH = 44;
const EMPTY_WS_PATH_SET: ReadonlySet<string> = new Set();

export type PmEditorServiceConfig = {
  saveCoordinator: EditorSaveCoordinator;
};

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`;
}

function truncateAssetToastFileName(fileName: string): string {
  const normalized = fileName.trim() || 'asset';
  if (normalized.length <= ASSET_TOAST_FILE_NAME_MAX_LENGTH) {
    return normalized;
  }

  const suffixLength = 16;
  const prefixLength = ASSET_TOAST_FILE_NAME_MAX_LENGTH - suffixLength - 3;
  return `${normalized.slice(0, prefixLength)}...${normalized.slice(
    -suffixLength,
  )}`;
}

function getAssetToastLabelInput(fileNames: readonly string[]): {
  fileName: string;
  remainingCount: number;
} {
  return {
    fileName: truncateAssetToastFileName(fileNames[0] ?? 'asset'),
    remainingCount: Math.max(0, fileNames.length - 1),
  };
}

type EditorEntry =
  | {
      name: string;
      editorView: ReturnType<typeof createEditor>;
      wsPath: string;
    }
  | { name: string; status: 'failed'; error: Error; wsPath: string }
  | { name: string; status: 'pending'; wsPath: string };

type ReadyEditorEntry = Extract<EditorEntry, { editorView: unknown }>;

/**
 * Manages ProseMirror editor instances and state. This is the ProseMirror
 * implementation of the `editorEngine` slot; everything outside this package
 * consumes it through `EditorEngineContract`.
 */
export class PmEditorService
  extends BaseService
  implements EditorEngineContract
{
  static deps = [
    'fileSystem',
    'navigation',
    'workbenchState',
    'workspaceState',
  ] as const;

  public readonly engineId = 'prosemirror';

  public readonly extensions: ReturnType<typeof setupExtensions>;

  /**
   * wsPaths whose stored Markdown does not survive a parse/serialize round
   * trip. Saving an edit to such a note reformats content the user never
   * touched, so the editor surface shows a fidelity notice while one of
   * these notes is open. Checked once per editor load and cleared on
   * unmount.
   */
  $roundTripWarnings = atom<ReadonlySet<string>>(EMPTY_WS_PATH_SET);

  private saveQueue: EditorSaveQueue;
  private pendingHeading: { fragment: string; wsPath: string } | undefined;
  private rememberedCursors = new Map<string, number>();

  private editors = new Map<HTMLElement, EditorEntry>();

  private markdownBySchema = new WeakMap<
    Schema,
    ReturnType<typeof markdownLoader>
  >();

  constructor(
    context: BaseServiceContext,
    private dependencies: {
      fileSystem: FileSystemService;
      navigation: NavigationService;
      workbenchState: WorkbenchStateService;
      workspaceState: WorkspaceStateService;
    },
    config: PmEditorServiceConfig,
  ) {
    super(SERVICE_NAME.pmEditorService, context, dependencies);

    this.extensions = setupExtensions(
      this.logger,
      (href, view) => this.openLink(view, href),
      {
        onActivate: (view, attrs) => {
          void this.openWikiLink(view, attrs.target);
        },
        resolveTarget: (attrs, state) => {
          const editor = this.getEditorEntryByView(
            (view) => view.state === state,
          );
          if (!editor) return false;
          const current = WsPath.safeParse(editor.wsPath).data?.asFile();
          if (!current) return false;
          return Boolean(
            resolveWikiLinkTarget(
              current,
              attrs.target,
              this.getWikiLinkIndex(current.wsName),
            ),
          );
        },
        unresolvedAriaLabel: ({ displayText }) =>
          t.app.editor.wikiLink.unresolvedLabel({ label: displayText }),
      },
      {
        storeFiles: (view, files, signal) =>
          this.storeAssetFiles(view, files, signal),
        cleanupStoredFiles: (assets) => {
          void this.cleanupStoredAssetFiles(assets);
        },
        resolveAssetReference: (view, target) =>
          this.resolveAssetReference(view, target),
      },
      {
        openAssetLink: (view, href) => this.openAssetLink(view, href),
      },
    );
    this.saveQueue = new EditorSaveQueue(
      async (wsPath, doc) => {
        const fileName = WsPath.assertFile(wsPath).fileName;
        await this.dependencies.fileSystem.writeFile(
          wsPath,
          new File([doc], fileName, {
            type: 'text/plain',
          }),
        );
      },
      this.emitAppError,
      config.saveCoordinator,
    );
  }

  hookMount() {
    this.addCleanup(() => {
      // Destroy all editor views
      for (const [_domNode, editor] of this.editors) {
        if ('editorView' in editor) {
          editor.editorView.destroy();
        }
      }
      this.editors.clear();
      this.rememberedCursors.clear();
    });
    this.addCleanup(
      this.store.sub(this.dependencies.navigation.$routeInfo, () => {
        const pending = this.pendingHeading;
        const routeInfo = this.store.get(
          this.dependencies.navigation.$routeInfo,
        );
        if (
          pending &&
          (routeInfo.route !== 'editor' ||
            routeInfo.payload.wsPath !== pending.wsPath)
        ) {
          this.pendingHeading = undefined;
        }
      }),
    );
    this.addCleanup(
      this.store.sub(this.dependencies.workspaceState.$noteWsPaths, () => {
        for (const editor of this.editors.values()) {
          if ('editorView' in editor) {
            editor.editorView.dispatch(
              editor.editorView.state.tr.setMeta(
                'wiki-link-targets-changed',
                true,
              ),
            );
          }
        }
      }),
    );
    this.addCleanup(
      this.store.sub(this.dependencies.fileSystem.$fileRenameEvent, () => {
        const event = this.store.get(
          this.dependencies.fileSystem.$fileRenameEvent,
        );
        if (event) {
          this.handleFileRename(event.oldWsPath, event.wsPath);
        }
      }),
    );
  }

  private handleFileRename(oldWsPath: string, newWsPath: string): void {
    this.saveQueue.relocate(oldWsPath, newWsPath);

    for (const [domNode, editor] of this.editors) {
      if (editor.wsPath !== oldWsPath) {
        continue;
      }
      this.editors.set(domNode, { ...editor, wsPath: newWsPath });
    }
  }

  mountEditor({
    domNode,
    wsPath,
    name,
    focus = true,
  }: {
    domNode: HTMLElement;
    wsPath: string;
    name: string;
    focus?: boolean;
  }) {
    if (this.editors.has(domNode)) {
      return () => this.unmountEditor(domNode);
    }

    const wsPathObj = WsPath.fromString(wsPath);
    wsPathObj.assertMarkdown();

    // Mark this editor as pending
    this.editors.set(domNode, { name, status: 'pending', wsPath });

    void this.loadEditor({ domNode, focus, name, wsPath });

    return () => this.unmountEditor(domNode);
  }

  private async loadEditor({
    domNode,
    focus,
    name,
    wsPath,
  }: {
    domNode: HTMLElement;
    focus: boolean;
    name: string;
    wsPath: string;
  }): Promise<void> {
    try {
      const content = await this.dependencies.fileSystem.readFileAsText(wsPath);
      const editorEntry = this.editors.get(domNode);
      if (!editorEntry || 'editorView' in editorEntry) {
        // Editor was unmounted or already initialized, don't create new editorView
        return;
      }

      const editorView = createEditor({
        defaultContent: content ?? '',
        store: this.store as Store,
        domNode,
        onDocChange: (doc) => {
          const currentWsPath = this.editors.get(domNode)?.wsPath ?? wsPath;
          this.saveQueue.enqueue(currentWsPath, doc);
        },
        extensions: this.extensions,
        nodeViews: {
          image: createLocalImageNodeView({
            currentWsPath: wsPath,
            fileSystem: this.dependencies.fileSystem,
            logger: this.logger,
          }),
        },
      });

      this.editors.set(domNode, { name, editorView, wsPath });
      this.checkRoundTripFidelity({
        content: content ?? '',
        editorView,
        wsPath,
      });
      editorView.dispatch(
        editorView.state.tr.setMeta('wiki-link-targets-changed', true),
      );
      if (focus) {
        editorView.focus();
      }
      const pendingHeading = this.pendingHeading;
      if (pendingHeading?.wsPath === wsPath) {
        const { fragment } = pendingHeading;
        this.pendingHeading = undefined;
        this.navigateToHeading(editorView, fragment);
      } else {
        if (pendingHeading) {
          this.pendingHeading = undefined;
        }
        this.restoreCursor(editorView, wsPath);
      }
    } catch (cause) {
      const editorEntry = this.editors.get(domNode);
      if (!editorEntry || 'editorView' in editorEntry) {
        return;
      }

      const error = cause instanceof Error ? cause : new Error(String(cause));
      if (this.pendingHeading?.wsPath === wsPath) {
        this.pendingHeading = undefined;
      }
      this.editors.set(domNode, { name, status: 'failed', error, wsPath });
      this.logger.error('Unable to load note', error);
      this.emitAppError(
        createAppError('error::editor:load-failed', 'Unable to load note', {
          error,
          wsPath,
        }),
      );
    }
  }

  private unmountEditor(domNode: HTMLElement) {
    const editor = this.editors.get(domNode);
    if (editor && 'editorView' in editor) {
      const position = getRememberedCursorPosition(
        editor.editorView.state.selection,
      );
      if (position === undefined) {
        this.rememberedCursors.delete(editor.wsPath);
      } else {
        this.rememberedCursors.set(editor.wsPath, position);
      }
      editor.editorView.destroy();
    }
    this.editors.delete(domNode);
    if (editor) {
      this.setRoundTripWarning(editor.wsPath, false);
    }
  }

  private restoreCursor(editorView: EditorView, wsPath: string): void {
    const position = this.rememberedCursors.get(wsPath);
    if (position === undefined) {
      return;
    }
    const selection = resolveRememberedCursor(editorView.state.doc, position);
    if (!selection) {
      return;
    }
    editorView.dispatch(
      editorView.state.tr.setSelection(selection).scrollIntoView(),
    );
    // Restoring a cursor inside a Markdown link is navigation state, not a
    // user interaction with that link. Keep the cursor without reopening the
    // floating link editor, which can otherwise cover content after returning
    // to a note.
    this.extensions.linkMenu.command.dismissLinkMenu()(
      editorView.state,
      editorView.dispatch,
      editorView,
    );
  }

  /**
   * Verifies the freshly loaded document serializes back to the exact
   * source it was parsed from. A failure here never blocks the editor —
   * the user can still read and edit — but it flips the fidelity warning
   * so the reformat-on-save behavior is visible instead of silent.
   */
  private checkRoundTripFidelity({
    content,
    editorView,
    wsPath,
  }: {
    content: string;
    editorView: EditorView;
    wsPath: string;
  }): void {
    try {
      const serialized = this.getMarkdown(
        editorView.state.schema,
      ).serializer.serialize(editorView.state.doc);
      const preserved = isMarkdownRoundTripPreserved(content, serialized);
      if (!preserved) {
        this.logger.warn(
          `Markdown round-trip mismatch for ${wsPath}: saving an edit will reformat parts of this note`,
        );
      }
      this.setRoundTripWarning(wsPath, !preserved);
    } catch (error) {
      // If the serializer itself fails we cannot prove fidelity, which is
      // exactly what the warning communicates.
      this.logger.warn(
        `Unable to verify Markdown round-trip for ${wsPath}`,
        error,
      );
      this.setRoundTripWarning(wsPath, true);
    }
  }

  private setRoundTripWarning(wsPath: string, hasWarning: boolean): void {
    const current = this.store.get(this.$roundTripWarnings);
    if (current.has(wsPath) === hasWarning) {
      return;
    }
    const next = new Set(current);
    if (hasWarning) {
      next.add(wsPath);
    } else {
      next.delete(wsPath);
    }
    this.store.set(this.$roundTripWarnings, next);
  }

  retryLoadEditor(domNode: HTMLElement, focus = true): boolean {
    const editor = this.editors.get(domNode);
    if (!editor || 'editorView' in editor || editor.status !== 'failed') {
      return false;
    }

    this.editors.set(domNode, {
      name: editor.name,
      status: 'pending',
      wsPath: editor.wsPath,
    });
    void this.loadEditor({
      domNode,
      focus,
      name: editor.name,
      wsPath: editor.wsPath,
    });

    return true;
  }

  getEditorLoadStatus(
    name: string,
  ):
    | { status: 'failed'; error: Error; wsPath: string }
    | { status: 'pending'; wsPath: string }
    | { status: 'ready'; wsPath: string }
    | { status: 'missing' } {
    for (const [_, editor] of this.editors) {
      if (editor.name !== name) {
        continue;
      }

      if ('editorView' in editor) {
        return { status: 'ready', wsPath: editor.wsPath };
      }

      if (editor.status === 'failed') {
        return {
          status: 'failed',
          error: editor.error,
          wsPath: editor.wsPath,
        };
      }

      return { status: 'pending', wsPath: editor.wsPath };
    }

    return { status: 'missing' };
  }

  getSaveStatus(wsPath: string): EditorSaveStatus {
    return this.saveQueue.getStatus(wsPath);
  }

  hasPendingOrFailedSave(wsPath?: string): boolean {
    return this.saveQueue.hasPendingOrFailed(wsPath);
  }

  subscribeToSaveStatus(listener: () => void, wsPath?: string): () => void {
    return this.saveQueue.subscribe(listener, wsPath);
  }

  retryFailedSave(wsPath: string): boolean {
    return this.saveQueue.retryFailed(wsPath);
  }

  getEditor(name: string) {
    for (const [_, editor] of this.editors) {
      if (editor.name === name && 'editorView' in editor) {
        return editor.editorView;
      }
    }
    return undefined;
  }

  private getEditorEntryByView(
    editorView:
      | ReturnType<typeof createEditor>
      | ((editorView: ReturnType<typeof createEditor>) => boolean),
  ): ReadyEditorEntry | undefined {
    for (const editor of this.editors.values()) {
      if (!('editorView' in editor)) {
        continue;
      }
      const matches =
        typeof editorView === 'function'
          ? editorView(editor.editorView)
          : editor.editorView === editorView;
      if (matches) {
        return editor;
      }
    }
    return undefined;
  }

  private async storeAssetFiles(
    editorView: ReturnType<typeof createEditor>,
    files: readonly File[],
    signal: AbortSignal,
  ): Promise<StoredMarkdownAsset[]> {
    const editor = this.getEditorEntryByView(editorView);
    if (!editor) {
      return [];
    }

    const preference = this.store.get(
      this.dependencies.workbenchState.$assetLocationPreference,
    );

    const inputToastLabel = getAssetToastLabelInput(
      files.map(displayNameForAsset),
    );
    let failedCount = 0;
    const failedAssetNames: string[] = [];
    let oversizedAsset: { fileName: string; maxFileSize: string } | undefined;
    const toastId = `editor-assets:${editor.wsPath}:${Date.now()}`;
    toast.loading(t.app.toasts.assetSaveInProgress(inputToastLabel), {
      id: toastId,
    });

    const stored = await storeWorkspaceAssetFiles({
      sourceWsPath: editor.wsPath,
      files,
      preference,
      fileSystem: this.dependencies.fileSystem,
      signal,
      onFileError: ({ error, file }) => {
        failedCount += 1;
        failedAssetNames.push(displayNameForAsset(file));
        if (isAppError(error)) {
          const appError = getAppErrorCause(error);
          if (appError?.name === 'error::file:size-too-large') {
            oversizedAsset ??= {
              fileName: truncateAssetToastFileName(appError.payload.fileName),
              maxFileSize: formatFileSize(appError.payload.maxFileSizeBytes),
            };
            this.logger.warn('Rejected oversized asset', error);
            this.emitAppError(error);
            return;
          }
        }
        this.logger.error('Unable to store pasted asset', error);
        this.emitAppError(
          createAppError(
            'error::editor:asset-write-failed',
            'Unable to store asset',
            {
              error,
              wsPath: editor.wsPath,
            },
          ),
        );
      },
    });
    const markdownAssets = stored.filter(
      (asset): asset is StoredMarkdownAsset => Boolean(asset.href),
    );
    if (signal.aborted) {
      toast.dismiss(toastId);
      return markdownAssets;
    }

    if (failedCount > 0) {
      if (failedCount === 1 && markdownAssets.length === 0 && oversizedAsset) {
        toast.error(t.app.toasts.assetTooLarge(oversizedAsset), {
          id: toastId,
          duration: 7000,
        });
        return markdownAssets;
      }

      const savedToastLabel =
        markdownAssets.length > 0
          ? getAssetToastLabelInput(markdownAssets.map((asset) => asset.label))
          : undefined;
      const failedToastLabel = getAssetToastLabelInput(failedAssetNames);
      toast.error(
        t.app.toasts.assetSavePartial({
          failedCount,
          failedFileName: failedToastLabel.fileName,
          failedRemainingCount: failedToastLabel.remainingCount,
          savedFileName: savedToastLabel?.fileName,
          savedRemainingCount: savedToastLabel?.remainingCount ?? 0,
        }),
        { id: toastId, duration: 5000 },
      );
    } else if (markdownAssets.length > 0) {
      const firstAsset = markdownAssets[0];
      const savedToastLabel = getAssetToastLabelInput(
        markdownAssets.map((asset) => asset.label),
      );
      toast.success(t.app.toasts.assetSaveSucceeded(savedToastLabel), {
        id: toastId,
        duration: 5000,
        action: firstAsset
          ? {
              label: t.app.toasts.openAsset,
              onClick: () => {
                this.dependencies.navigation.goWsFile(firstAsset.wsPath.wsPath);
                toast.dismiss(toastId);
              },
            }
          : undefined,
      });
    } else {
      toast.dismiss(toastId);
    }
    return markdownAssets;
  }

  private async cleanupStoredAssetFiles(
    assets: readonly StoredMarkdownAsset[],
  ): Promise<void> {
    await Promise.all(
      assets.map(async (asset) => {
        try {
          await this.dependencies.fileSystem.deleteFile(asset.wsPath.wsPath);
        } catch (cause) {
          const error =
            cause instanceof Error ? cause : new Error(String(cause));
          this.logger.warn('Unable to clean up unused stored asset', error);
        }
      }),
    );
  }

  private resolveAssetReference(
    view: EditorView,
    target: string,
  ): MarkdownAssetReference | undefined {
    const editor = [...this.editors.values()].find(
      (entry) => 'editorView' in entry && entry.editorView === view,
    );
    if (!editor || !('editorView' in editor)) {
      return undefined;
    }

    const currentWsPath = WsPath.safeParse(editor.wsPath).data?.asFile();
    if (!currentWsPath) {
      return undefined;
    }

    const existingWsPaths = new Set(
      this.store
        .get(this.dependencies.workspaceState.$wsPaths)
        .map((path) => path.wsPath),
    );
    const assetWsPath = resolveWorkspaceMarkdownAssetReferenceCandidates(
      currentWsPath,
      target,
    ).find((candidate) => existingWsPaths.has(candidate.wsPath));
    if (!assetWsPath) {
      return undefined;
    }

    const href =
      relativeMarkdownAssetHref(currentWsPath, assetWsPath) ??
      workspaceRootMarkdownAssetHref(assetWsPath);
    if (!href) {
      return undefined;
    }

    return {
      href,
      isImage: getEmbeddableWorkspaceAssetKind(assetWsPath) === 'image',
      label: assetWsPath.fileName,
    };
  }

  /** Opens a web link externally or routes a relative Markdown link in-app. */
  openLink(editorView: ReturnType<typeof createEditor>, href: string): void {
    const editor = this.getEditorEntryByView(editorView);
    if (!editor) {
      return;
    }

    const target = normalizeStoredMarkdownLinkTarget(href);
    if (target?.kind === 'internal') {
      const wsPath = resolveInternalLink(editor.wsPath, target.href);
      if (wsPath) {
        const fragment = getInternalLinkHeading(target.href);
        if (wsPath === editor.wsPath) {
          if (fragment) {
            this.navigateToHeading(editorView, fragment);
          }
          return;
        }
        this.pendingHeading = fragment ? { fragment, wsPath } : undefined;
        this.dependencies.navigation.goWsPath(wsPath);
      }
      return;
    }

    if (this.openAssetLink(editorView, href, { includeMarkdown: true })) {
      return;
    }

    if (target?.kind === 'external') {
      window.open(target.href, '_blank', 'noopener,noreferrer');
    }
  }

  private openAssetLink(
    editorView: ReturnType<typeof createEditor>,
    href: string,
    options: { includeMarkdown?: boolean } = {},
  ): boolean {
    const editor = this.getEditorEntryByView(editorView);
    if (!editor) {
      return false;
    }

    const assetWsPath = resolveLocalMarkdownAsset(editor.wsPath, href);
    if (!assetWsPath) {
      return false;
    }

    if (assetWsPath.isMarkdown()) {
      if (!options.includeMarkdown) {
        return false;
      }
      this.dependencies.navigation.goWsPath(assetWsPath.wsPath);
      return true;
    }

    this.dependencies.navigation.go({
      route: 'asset',
      payload: { wsPath: assetWsPath.wsPath },
    });
    return true;
  }

  /** Opens an existing wiki target, or creates a safe missing Markdown target. */
  async openWikiLink(
    editorView: ReturnType<typeof createEditor>,
    target: string,
  ): Promise<void> {
    const editor = this.getEditorEntryByView(editorView);
    if (!editor) return;
    const current = WsPath.safeParse(editor.wsPath).data?.asFile();
    if (!current) return;
    const resolved = resolveWikiLinkTarget(
      current,
      target,
      this.getWikiLinkIndex(current.wsName),
    );
    if (resolved && resolved.wsPath !== editor.wsPath) {
      this.dependencies.navigation.goWsPath(resolved.wsPath);
      return;
    }

    if (resolved) {
      return;
    }

    const missingTarget = createMissingWikiLinkTarget(current, target);
    if (!missingTarget) {
      return;
    }

    try {
      await this.dependencies.fileSystem.createFile(
        missingTarget.wsPath,
        new File([''], missingTarget.fileName, {
          type: 'text/plain',
        }),
      );
      this.dependencies.navigation.goWsPath(missingTarget.wsPath);
    } catch (cause) {
      if (isAppError(cause)) {
        const appError = getAppErrorCause(cause);
        if (appError?.name === 'error::file:already-existing') {
          this.dependencies.navigation.goWsPath(missingTarget.wsPath);
          return;
        }
      }

      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.logger.error('Unable to create missing wiki link target', error);
      this.emitAppError(
        createAppError(
          'error::file:invalid-note-path',
          'Unable to create linked note',
          {
            invalidWsPath: missingTarget.wsPath,
          },
        ),
      );
    }
  }

  private getWikiLinkIndex(wsName: string): WikiLinkIndex {
    const currentIndex = this.store.get(
      this.dependencies.workspaceState.$wikiLinkIndex,
    );
    if (currentIndex?.wsName === wsName) {
      return currentIndex;
    }
    const wsPaths = this.store.get(
      this.dependencies.workspaceState.$noteWsPaths,
    );
    return createWikiLinkIndex(wsPaths, wsName);
  }

  private navigateToHeading(
    editorView: ReturnType<typeof createEditor>,
    fragment: string,
  ): boolean {
    const headings: Array<{ pos: number; text: string }> = [];
    editorView.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        headings.push({ pos, text: node.textContent });
      }
    });
    const index = findHeadingIndexBySlug(
      headings.map(({ text }) => text),
      fragment,
    );
    const heading = index === undefined ? undefined : headings[index];
    if (!heading) {
      return false;
    }
    editorView.dispatch(
      editorView.state.tr
        .setSelection(
          TextSelection.near(editorView.state.doc.resolve(heading.pos + 1)),
        )
        .scrollIntoView(),
    );
    return true;
  }

  focusEditor() {
    for (const [_, editor] of this.editors) {
      if (
        'editorView' in editor &&
        !editor.editorView.isDestroyed &&
        !editor.editorView.hasFocus()
      ) {
        editor.editorView.focus();
        return;
      }
    }
  }

  /** Toggles the block at the current selection to/from a heading. */
  toggleHeading(level: number): boolean {
    const view = this.getActiveEditorView();
    if (!view) {
      return false;
    }
    const handled = this.extensions.heading.command.toggleHeading(level)(
      view.state,
      view.dispatch,
      view,
    );
    if (handled) {
      view.focus();
    }
    return handled;
  }

  /** Inserts a starter table at the current selection. */
  insertTable(): boolean {
    const view = this.getActiveEditorView();
    if (!view) {
      return false;
    }
    const handled = this.extensions.table.command.insertTable()(
      view.state,
      view.dispatch,
      view,
    );
    if (handled) {
      // Replacing the focused block with the table drops DOM focus; restore
      // it so typing goes into the first cell.
      view.focus();
    }
    return handled;
  }

  /** Folds/unfolds the heading section at the current selection. */
  toggleHeadingCollapse(): boolean {
    const view = this.getActiveEditorView();
    if (!view) {
      return false;
    }
    return this.extensions.collapsibleHeading.command.toggleHeadingCollapse(
      view.state,
      view.dispatch,
    );
  }

  /** Folds every heading of the given level in the active editor. */
  collapseAllHeadings(level: number): boolean {
    const view = this.getActiveEditorView();
    if (!view) {
      return false;
    }
    return this.extensions.collapsibleHeading.command.collapseAllHeadingsAtLevel(
      level,
    )(view.state, view.dispatch);
  }

  /** Expands every folded heading section in the active editor. */
  uncollapseAllHeadings(): boolean {
    const view = this.getActiveEditorView();
    if (!view) {
      return false;
    }
    return this.extensions.collapsibleHeading.command.uncollapseAllHeadings(
      view.state,
      view.dispatch,
    );
  }

  /**
   * Serializes the current selection in the active editor to Markdown.
   *
   * Reuses the same serializer configuration as the save path so copied
   * content matches what would be written to disk. Returns null when there is
   * no active editor or the selection is empty.
   */
  getSelectionMarkdown(): string | null {
    const view = this.getActiveEditorView();
    if (!view) {
      return null;
    }
    const { from, to, empty } = view.state.selection;
    if (empty) {
      return null;
    }
    return this.getMarkdown(view.state.schema).serializer.serialize(
      view.state.doc.cut(from, to),
    );
  }

  /**
   * Parses `markdownText` and inserts the resulting rich content at the current
   * selection in the active editor, replacing any selected content. This is the
   * inverse of {@link getSelectionMarkdown} and uses the same loader as the save
   * path so round-tripping preserves Markdown fidelity.
   *
   * A single parsed paragraph is inserted inline so it merges into the current
   * paragraph; headings and other block content are inserted as blocks. Returns
   * false when there is no active editor or the text produces no insertable
   * content (so a selection is never silently deleted).
   */
  insertMarkdownAtSelection(markdownText: string): boolean {
    const view = this.getActiveEditorView();
    if (!view) {
      return false;
    }
    const parsed = this.getMarkdown(view.state.schema).parser.parse(
      markdownText,
    );
    const inline =
      parsed.childCount === 1 && parsed.firstChild?.type.name === 'paragraph';
    const slice = inline
      ? parsed.slice(1, Math.max(1, parsed.content.size - 1))
      : parsed.slice(0, parsed.content.size);
    if (slice.size === 0) {
      return false;
    }
    view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
    view.focus();
    return true;
  }

  private getMarkdown(schema: Schema) {
    const existing = this.markdownBySchema.get(schema);
    if (existing) {
      return existing;
    }

    const markdown = markdownLoader(
      [...Object.values(this.extensions)],
      schema,
    );
    this.markdownBySchema.set(schema, markdown);
    return markdown;
  }

  private getActiveEditorView() {
    let fallback: ReturnType<typeof createEditor> | undefined;
    for (const editor of this.editors.values()) {
      if ('editorView' in editor && !editor.editorView.isDestroyed) {
        if (editor.editorView.hasFocus()) {
          return editor.editorView;
        }
        fallback ??= editor.editorView;
      }
    }
    return fallback;
  }
}
