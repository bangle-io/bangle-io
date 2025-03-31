import { BaseService, type BaseServiceContext } from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import type { FileSystemService } from '@bangle.io/service-core';
import type { Store } from '@bangle.io/types';
import { WsPath } from '@bangle.io/ws-path';

import { setupExtensions } from './extensions';
import { createEditor } from './pm-setup';

export type PmEditorServiceConfig = {
  nothing: boolean;
};

/**
 * Manages ProseMirror editor instances and state
 */
export class PmEditorService extends BaseService {
  static deps = ['fileSystem'] as const;

  public readonly extensions: ReturnType<typeof setupExtensions>;

  private editors = new Map<
    HTMLElement,
    | { name: string; editorView: ReturnType<typeof createEditor> }
    | { name: string; status: 'pending' }
  >();

  constructor(
    context: BaseServiceContext,
    private dependencies: {
      fileSystem: FileSystemService;
    },
    private config: PmEditorServiceConfig,
  ) {
    super(SERVICE_NAME.pmEditorService, context, dependencies);

    this.extensions = setupExtensions(this.logger);
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
    const fileName = WsPath.assertFile(wsPath).fileName;

    // Mark this editor as pending
    this.editors.set(domNode, { name, status: 'pending' });

    this.dependencies.fileSystem.readFileAsText(wsPath).then((content) => {
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
          this.dependencies.fileSystem.writeFile(
            wsPath,
            new File([doc], fileName, {
              type: 'text/plain',
            }),
          );
        },
        extensions: this.extensions,
      });

      this.editors.set(domNode, { name, editorView });
      if (focus) {
        editorView.focus();
      }
    });

    return () => this.unmountEditor(domNode);
  }

  private unmountEditor(domNode: HTMLElement) {
    const editor = this.editors.get(domNode);
    if (editor && 'editorView' in editor) {
      editor.editorView.destroy();
    }
    this.editors.delete(domNode);
  }

  getEditor(name: string) {
    for (const [_, editor] of this.editors) {
      if (editor.name === name && 'editorView' in editor) {
        return editor.editorView;
      }
    }
    return undefined;
  }
}
