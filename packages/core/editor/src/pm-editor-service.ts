import { BaseService, type BaseServiceContext } from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import type { FileSystemService } from '@bangle.io/service-core';
import type { Store } from '@bangle.io/types';
import { assertedResolvePath } from '@bangle.io/ws-path';
import { assertValidMarkdownWsPath } from '@bangle.io/ws-path';

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
    string,
    { editorView: ReturnType<typeof createEditor> }
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
      // Cleanup code here
    });
  }

  private mountEditor({
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
    if (this.editors.has(name)) {
      return;
    }
    assertValidMarkdownWsPath(wsPath);
    const fileName = assertedResolvePath(wsPath).fileName;
    this.dependencies.fileSystem.readFileAsText(wsPath).then((content) => {
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
      this.editors.set(name, { editorView });
      if (focus) {
        editorView.focus();
      }
    });
  }

  // returns a callback ref to mount the editor
  newEditor({ wsPath, name }: { wsPath: string; name: string }) {
    if (this.aborted) {
      return;
    }

    if (this.editors.has(name)) {
      throw new Error(`Editor with name ${name} already exists`);
    }

    let domNode: HTMLElement | null = null;

    return (_domNode: HTMLElement | null | undefined) => {
      if (_domNode && !domNode) {
        domNode = _domNode;
        this.mountEditor({ domNode, wsPath, name });
      }

      if (!_domNode && domNode) {
        const existing = this.editors.get(name);
        if (existing) {
          existing.editorView.destroy();
          this.editors.delete(name);
        }
        domNode = null;
      }
    };
  }

  getEditor(name: string) {
    return this.editors.get(name)?.editorView;
  }
}
