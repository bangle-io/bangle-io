import { BaseService, type BaseServiceContext } from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import type { NodeType, PMNode } from '@bangle.io/prosemirror-plugins';
import type {
  FileSystemService,
  NavigationService,
} from '@bangle.io/service-core';
import type { Store, WorkspaceAttachmentConfig } from '@bangle.io/types';
import { WsPath } from '@bangle.io/ws-path';

import {
  getAttachmentDestinationPaths,
  resolveImageWsPath,
  resolveWorkspaceAttachmentConfig,
} from './attachments';
import { setupExtensions } from './extensions';
import { getResolvedNoteLinkWsPathCandidates } from './note-links';
import { createEditor } from './pm-setup';

export type PmEditorServiceConfig = {
  nothing: boolean;
};

/**
 * Manages ProseMirror editor instances and state
 */
export class PmEditorService extends BaseService {
  static deps = ['fileSystem', 'navigation'] as const;
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
      navigation: NavigationService;
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
    const filePath = WsPath.assertFile(wsPath);
    const fileName = filePath.fileName;
    let attachmentConfigPromise: Promise<WorkspaceAttachmentConfig> | undefined;

    const getAttachmentConfig = async () => {
      if (!attachmentConfigPromise) {
        attachmentConfigPromise = this.dependencies.fileSystem
          .getWorkspaceInfo({
            wsName: filePath.wsName,
          })
          .then((wsInfo) => resolveWorkspaceAttachmentConfig(wsInfo?.metadata));
      }

      return attachmentConfigPromise;
    };

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
        extensions: setupExtensions(this.logger, {
          image: {
            createImageNodes: async (files: File[], imageType: NodeType) =>
              this.createImageNodesForWorkspace(
                files,
                imageType,
                wsPath,
                getAttachmentConfig,
              ),
            resolveImageNodeSrc: async (src: string) =>
              this.resolveImageNodeSrc(wsPath, src, getAttachmentConfig),
          },
          link: {
            onOpenLink: async (href: string) =>
              this.openWorkspaceNoteLink(wsPath, href),
          },
        }),
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

  private async createImageNodesForWorkspace(
    files: File[],
    imageType: NodeType,
    noteWsPath: string,
    getAttachmentConfig: () => Promise<WorkspaceAttachmentConfig>,
  ): Promise<PMNode[]> {
    const attachmentConfig = await getAttachmentConfig();
    const createdNodes: PMNode[] = [];
    const timestamp = this.getTimestampForFileName();

    for (const [index, file] of files.entries()) {
      const extension = this.getFileExtension(file);
      const fileName = `${attachmentConfig.fileNamePrefix} ${timestamp}-${index + 1}.${extension}`;
      const destination = getAttachmentDestinationPaths(
        noteWsPath,
        fileName,
        attachmentConfig,
      );

      try {
        await this.dependencies.fileSystem.createFile(
          destination.wsPath,
          new File([await file.arrayBuffer()], fileName, {
            type: file.type || 'application/octet-stream',
          }),
        );

        createdNodes.push(
          imageType.create({
            src: this.encodeMarkdownImagePath(destination.markdownPath),
          }),
        );
      } catch (error) {
        this.logger.error('Failed to save pasted image in workspace', {
          error,
          noteWsPath,
          destinationWsPath: destination.wsPath,
        });
      }
    }

    return createdNodes;
  }

  private async resolveImageNodeSrc(
    noteWsPath: string,
    src: string,
    getAttachmentConfig: () => Promise<WorkspaceAttachmentConfig>,
  ): Promise<string | undefined> {
    const attachmentConfig = await getAttachmentConfig();
    const imageWsPath = resolveImageWsPath(noteWsPath, src, attachmentConfig);
    if (!imageWsPath) {
      return undefined;
    }

    try {
      const imageFile =
        await this.dependencies.fileSystem.readFile(imageWsPath);
      if (!imageFile) {
        return undefined;
      }

      return URL.createObjectURL(imageFile);
    } catch (error) {
      this.logger.warn('Failed to resolve image source from workspace', {
        error,
        noteWsPath,
        src,
        imageWsPath,
      });
      return undefined;
    }
  }

  private encodeMarkdownImagePath(path: string): string {
    return encodeURI(path).replace(/#/g, '%23');
  }

  private async openWorkspaceNoteLink(
    noteWsPath: string,
    href: string,
  ): Promise<boolean> {
    const candidates = getResolvedNoteLinkWsPathCandidates(noteWsPath, href);
    this.logger.debug('Resolving note link', {
      noteWsPath,
      href,
      candidates,
    });
    if (candidates.length === 0) {
      return false;
    }

    for (const wsPath of candidates) {
      try {
        if (await this.dependencies.fileSystem.exists(wsPath)) {
          this.logger.debug('Resolved note link to workspace path', {
            href,
            wsPath,
          });
          this.dependencies.navigation.goWsPath(wsPath);
          return true;
        }
      } catch {
        // ignore invalid/non-file candidates and continue to next fallback
      }
    }

    return false;
  }

  private getTimestampForFileName(): string {
    const date = new Date();
    const parts = [
      date.getFullYear().toString(),
      (date.getMonth() + 1).toString().padStart(2, '0'),
      date.getDate().toString().padStart(2, '0'),
      date.getHours().toString().padStart(2, '0'),
      date.getMinutes().toString().padStart(2, '0'),
      date.getSeconds().toString().padStart(2, '0'),
    ];

    return parts.join('');
  }

  private getFileExtension(file: File): string {
    const fileName = file.name || '';
    const extIndex = fileName.lastIndexOf('.');
    if (extIndex !== -1 && extIndex < fileName.length - 1) {
      const ext = fileName.slice(extIndex + 1).toLowerCase();
      if (ext) {
        return ext;
      }
    }

    const mimeExtension = file.type.split('/')[1]?.toLowerCase();
    if (mimeExtension) {
      return mimeExtension;
    }

    return 'png';
  }
}
