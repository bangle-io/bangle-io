import {
  BaseService,
  type BaseServiceContext,
  createAppError,
  getAppErrorCause,
  isAppError,
} from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import { TextSelection } from '@bangle.io/prosemirror-plugins';
import type {
  FileSystemService,
  NavigationService,
  WorkspaceStateService,
} from '@bangle.io/service-core';
import type { Store } from '@bangle.io/types';
import {
  createMissingWikiLinkTarget,
  createWikiLinkIndex,
  resolveWikiLinkTarget,
  type WikiLinkIndex,
  WsPath,
} from '@bangle.io/ws-path';

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
import { createEditor } from './pm-setup';

const editorSaveQueueStore = createEditorSaveQueueStore();

export type PmEditorServiceConfig = {
  nothing: boolean;
};

/**
 * Manages ProseMirror editor instances and state
 */
export class PmEditorService extends BaseService {
  static deps = ['fileSystem', 'navigation', 'workspaceState'] as const;

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
      workspaceState: WorkspaceStateService;
    },
    _config: PmEditorServiceConfig,
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
      this.store.sub(this.dependencies.workspaceState.$wsPaths, () => {
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

    if (target?.kind === 'external') {
      window.open(target.href, '_blank', 'noopener,noreferrer');
    }
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
    const wsPaths = this.store.get(this.dependencies.workspaceState.$wsPaths);
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
}
