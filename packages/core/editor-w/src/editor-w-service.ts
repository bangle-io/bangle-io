import {
  BaseService,
  type BaseServiceContext,
  createAppError,
} from '@bangle.io/base-utils';
import { type EditorEngineId, SERVICE_NAME } from '@bangle.io/constants';
import type { EditorAction, EditorEngineContract } from '@bangle.io/context';
import type { FileSystemService } from '@bangle.io/service-core';
import { WsPath } from '@bangle.io/ws-path';
import { atom } from 'jotai';

type EditorEntry = {
  name: string;
  wsPath: string;
  status: 'pending' | 'ready' | 'failed';
};

/**
 * The Wordgard engine implementation of the `editorEngine` slot.
 *
 * M0b stub: renders the note's Markdown source read-only — no Wordgard code
 * yet. Its purpose is to make the engine switch real and testable end to end
 * (URL selection, composition-root selection, reload round-trip, boot
 * guard) before any writable Wordgard editor exists. Because it never
 * mutates the document there is nothing to save: the save-related contract
 * methods report a permanently clean state, which keeps save protection and
 * dirty-state UI truthful.
 */
export class EditorWService
  extends BaseService
  implements EditorEngineContract
{
  static deps = ['fileSystem'] as const;

  public readonly engineId: EditorEngineId = 'wordgard';

  /**
   * Wordgard renders the note's Markdown source read-only and never rewrites
   * it, so no note is ever at risk of round-trip reformatting: the fidelity
   * set is permanently empty.
   */
  public readonly $roundTripWarnings = atom<ReadonlySet<string>>(
    new Set<string>(),
  );

  private editors = new Map<HTMLElement, EditorEntry>();

  constructor(
    context: BaseServiceContext,
    private dependencies: {
      fileSystem: FileSystemService;
    },
  ) {
    super(SERVICE_NAME.editorWService, context, dependencies);
  }

  hookMount() {
    this.addCleanup(() => {
      this.editors.clear();
    });
  }

  mountEditor({
    domNode,
    wsPath,
    name,
    focus: _focus = true,
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

    this.editors.set(domNode, { name, wsPath, status: 'pending' });
    domNode.dataset.editorWStatus = 'pending';
    void this.loadNote(domNode, wsPath);

    return () => this.unmountEditor(domNode);
  }

  private async loadNote(domNode: HTMLElement, wsPath: string): Promise<void> {
    try {
      const content = await this.dependencies.fileSystem.readFileAsText(wsPath);
      const entry = this.editors.get(domNode);
      if (!entry || entry.status !== 'pending') {
        // Unmounted (or already resolved) while the read was in flight.
        return;
      }
      this.editors.set(domNode, { ...entry, status: 'ready' });
      domNode.textContent = content ?? '';
      domNode.dataset.editorWStatus = 'ready';
    } catch (cause) {
      const entry = this.editors.get(domNode);
      if (!entry || entry.status !== 'pending') {
        return;
      }
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.editors.set(domNode, { ...entry, status: 'failed' });
      // A failed load surfaces an error state and never writes anything
      // back to storage (repo invariant, restated here because a new engine
      // is exactly where it would silently regress).
      domNode.textContent = t.app.editorW.loadFailed;
      domNode.dataset.editorWStatus = 'failed';
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
    this.editors.delete(domNode);
  }

  focusEditor(): void {
    // Read-only stub: nothing focusable to hand the cursor to.
  }

  getSelectionMarkdown(): string | null {
    return null;
  }

  captureMarkdownInsertion(): null {
    return null;
  }

  insertMarkdownAtSelection(_markdownText: string): boolean {
    return false;
  }

  isActionAvailable(_action: EditorAction): boolean {
    return false;
  }

  /** The stub never writes, so there is never a pending or failed save. */
  hasPendingOrFailedSave(_wsPath?: string): boolean {
    return false;
  }

  retryFailedSave(_wsPath?: string): boolean {
    return false;
  }

  subscribeToSaveStatus(_listener: () => void, _wsPath?: string): () => void {
    // Save status can never change; subscribers get a working unsubscribe
    // and no notifications.
    return () => {};
  }

  toggleHeading(_level: number): boolean {
    return false;
  }

  insertTable(): boolean {
    return false;
  }

  toggleHeadingCollapse(): boolean {
    return false;
  }

  collapseAllHeadings(_level: number): boolean {
    return false;
  }

  uncollapseAllHeadings(): boolean {
    return false;
  }
}
