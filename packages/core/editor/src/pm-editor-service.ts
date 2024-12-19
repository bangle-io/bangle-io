import { BaseService, type BaseServiceContext } from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import type { FileSystemService } from '@bangle.io/service-core';
import { assertedResolvePath } from '@bangle.io/ws-path';
import { assertValidMarkdownWsPath } from '@bangle.io/ws-path';
import type { Editor } from 'prosekit/core';
import { createPMEditor } from './pm-setup';

export type PmEditorServiceConfig = {
  nothing: boolean;
};

/**
 * Manages ProseMirror editor instances and state
 */
export class PmEditorService extends BaseService {
  static deps = ['fileSystem'] as const;

  private editorMap = new WeakMap<HTMLElement, Editor>();

  constructor(
    context: BaseServiceContext,
    private dependencies: {
      fileSystem: FileSystemService;
    },
    private config: PmEditorServiceConfig,
  ) {
    super(SERVICE_NAME.pmEditorService, context, dependencies);
  }

  hookMount() {
    // Setup any event listeners or initialization here
    this.addCleanup(() => {
      // Cleanup code here
    });
  }

  private mountEditor(domNode: HTMLElement, wsPath: string) {
    if (this.editorMap.has(domNode)) {
      return;
    }

    assertValidMarkdownWsPath(wsPath);

    const fileName = assertedResolvePath(wsPath).fileName;
    this.dependencies.fileSystem.readFileAsText(wsPath).then((content) => {
      const editor = createPMEditor({
        defaultContent: content || '',
        onDocChange: (doc) => {
          this.dependencies.fileSystem.writeFile(
            wsPath,
            new File([doc], fileName, {
              type: 'text/plain',
            }),
          );
        },
      });
      this.editorMap.set(domNode, editor);
      editor?.mount(domNode);
      editor?.focus();
    });
  }

  private unmountEditor(domNode: HTMLElement) {
    const editor = this.editorMap.get(domNode);
    editor?.unmount();
    this.editorMap.delete(domNode);
  }

  newEditor({ wsPath }: { wsPath: string }) {
    if (this.aborted) {
      return;
    }

    let domNode: HTMLElement | null = null;

    return (_domNode: HTMLElement | null | undefined) => {
      if (_domNode && !domNode) {
        domNode = _domNode;

        this.mountEditor(domNode, wsPath);
      }

      if (!_domNode && domNode) {
        this.unmountEditor(domNode);
        domNode = null;
      }
    };
  }
}
