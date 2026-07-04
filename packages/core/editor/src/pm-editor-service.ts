import {
  BaseService,
  type BaseServiceContext,
  createAppError,
  getAppErrorCause,
  isAppError,
} from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import { type EditorView, TextSelection } from '@bangle.io/prosemirror-plugins';
import type {
  FileSystemService,
  NavigationService,
  WorkbenchStateService,
  WorkspaceStateService,
} from '@bangle.io/service-core';
import type { Store } from '@bangle.io/types';
import { toast } from '@bangle.io/ui-components';
import {
  createMissingWikiLinkTarget,
  createWikiLinkIndex,
  getEmbeddableWorkspaceAssetKind,
  relativeMarkdownAssetHref,
  resolveLocalMarkdownAsset,
  resolveWikiLinkTarget,
  resolveWorkspaceMarkdownAssetReference,
  type WikiLinkIndex,
  WsPath,
  workspaceRootMarkdownAssetHref,
} from '@bangle.io/ws-path';

import type { MarkdownAssetReference } from './asset-file-plugin';
import {
  displayNameForAsset,
  type StoredMarkdownAsset,
  storeWorkspaceAssetFiles,
} from './asset-storage';
import {
  createEditorSaveQueueStore,
  EditorSaveQueue,
  type EditorSaveStatus,
} from './editor-save-queue';
import { setupExtensions } from './extensions';
import { findHeadingIndexBySlug } from './heading-slug';
import {
  getInternalLinkHeading,
  normalizeStoredMarkdownLinkTarget,
  resolveInternalLink,
} from './link-target';
import { createLocalImageNodeView } from './local-image-node-view';
import { createEditor } from './pm-setup';

const editorSaveQueueStore = createEditorSaveQueueStore();
const ASSET_TOAST_FILE_NAME_MAX_LENGTH = 44;

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

/**
 * Manages ProseMirror editor instances and state
 */
export class PmEditorService extends BaseService {
  static deps = [
    'fileSystem',
    'navigation',
    'workbenchState',
    'workspaceState',
  ] as const;

  public readonly extensions: ReturnType<typeof setupExtensions>;

  private saveQueue: EditorSaveQueue;
  private pendingHeading: { fragment: string; wsPath: string } | undefined;

  private editors = new Map<
    HTMLElement,
    | {
        name: string;
        editorView: ReturnType<typeof createEditor>;
        wsPath: string;
      }
    | { name: string; status: 'failed'; error: Error; wsPath: string }
    | { name: string; status: 'pending'; wsPath: string }
  >();

  constructor(
    context: BaseServiceContext,
    private dependencies: {
      fileSystem: FileSystemService;
      navigation: NavigationService;
      workbenchState: WorkbenchStateService;
      workspaceState: WorkspaceStateService;
    },
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
          const editor = [...this.editors.values()].find(
            (entry) =>
              'editorView' in entry && entry.editorView.state === state,
          );
          if (!editor || !('editorView' in editor)) return false;
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
        storeFiles: (view, files) => this.storeAssetFiles(view, files),
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
      editorSaveQueueStore,
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
        defaultContent: content || '',
        store: this.store as Store,
        domNode,
        onDocChange: (doc) => {
          this.saveQueue.enqueue(wsPath, doc);
        },
        extensions: this.extensions,
        nodeViews: {
          image: createLocalImageNodeView({
            currentWsPath: wsPath,
            fileSystem: this.dependencies.fileSystem,
          }),
        },
      });

      this.editors.set(domNode, { name, editorView, wsPath });
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
      } else if (pendingHeading) {
        this.pendingHeading = undefined;
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
      editor.editorView.destroy();
    }
    this.editors.delete(domNode);
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

  subscribeToSaveStatus(listener: () => void): () => void {
    return this.saveQueue.subscribe(listener);
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

  private async storeAssetFiles(
    editorView: ReturnType<typeof createEditor>,
    files: readonly File[],
  ): Promise<StoredMarkdownAsset[]> {
    const editor = [...this.editors.values()].find(
      (entry) => 'editorView' in entry && entry.editorView === editorView,
    );
    if (!editor || !('editorView' in editor)) {
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
    const assetWsPath = currentWsPath
      ? resolveWorkspaceMarkdownAssetReference(currentWsPath, target)
      : undefined;
    if (!currentWsPath || !assetWsPath) {
      return undefined;
    }

    const existingWsPaths = new Set(
      this.store
        .get(this.dependencies.workspaceState.$wsPaths)
        .map((path) => path.wsPath),
    );
    if (!existingWsPaths.has(assetWsPath.wsPath)) {
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
    const editor = [...this.editors.values()].find(
      (entry) => 'editorView' in entry && entry.editorView === editorView,
    );
    if (!editor || !('editorView' in editor)) {
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
    const editor = [...this.editors.values()].find(
      (entry) => 'editorView' in entry && entry.editorView === editorView,
    );
    if (!editor || !('editorView' in editor)) {
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
    const editor = [...this.editors.values()].find(
      (entry) => 'editorView' in entry && entry.editorView === editorView,
    );
    if (!editor || !('editorView' in editor)) return;
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
