import { BangleEditor, BangleEditorState } from '@bangle.dev/core';
import type { Node } from '@bangle.dev/pm';
import { valuePlugin } from '@bangle.dev/utils';

import { EditorDisplayType, PRIMARY_EDITOR_INDEX } from '@bangle.io/constants';
import { EditorPluginMetadataKey } from '@bangle.io/editor-common';
import type {
  Extension,
  ExtensionRegistry,
} from '@bangle.io/extension-registry';
import { markdownParser } from '@bangle.io/markdown';
import type { EditorPluginMetadata } from '@bangle.io/shared-types';
import { createWsPath } from '@bangle.io/ws-path';

import { createExtensionRegistry } from './extension-registry';

if (typeof jest === 'undefined') {
  console.warn('test-utils not using with jest');
}
/**
 * Creates an editor from markdown string
 */
export function createEditorFromMd(
  md: string,
  {
    pluginMetadata = {},
    extensions = [],
    extensionRegistry,
    testId = 'test-editor',
  }: {
    extensionRegistry?: ExtensionRegistry;
    pluginMetadata?: Partial<EditorPluginMetadata>;
    extensions?: Extension[];
    testId?: string;
  } = {},
) {
  md = md.trim();
  const container = document.body.appendChild(document.createElement('div'));
  container.setAttribute('data-testid', testId);

  if (extensionRegistry && extensions) {
    throw new Error(
      'Can either provide extensionRegistry or extensions, but not both',
    );
  }

  const registry =
    extensionRegistry ||
    createExtensionRegistry(extensions, { editorCore: true });

  const editorProps = {
    attributes: { class: 'bangle-editor ' },
  };

  let editor = new BangleEditor(container, {
    state: new BangleEditorState({
      specRegistry: registry.specRegistry,
      plugins: () => [
        valuePlugin(EditorPluginMetadataKey, {
          wsPath: createWsPath('test:my-test.md'),
          editorDisplayType: EditorDisplayType.Page,
          editorId: PRIMARY_EDITOR_INDEX,
          dispatchSerialOperation: () => {},
          nsmStore: {} as any,
          createdAt: Date.now(),
          collabMessageBus: {} as any,

          ...pluginMetadata,
        }),
        ...registry.getPlugins(),
      ],
      editorProps,
      initialValue: markdownParser(
        md,
        registry.specRegistry,
        registry.markdownItPlugins,
      ),
    }),
  });

  return editor;
}

export function createEditorFromNode(
  node: Node,
  {
    pluginMetadata = {},
    extensionRegistry,
    extensions = [],
    testId = 'test-editor',
  }: {
    extensionRegistry?: ExtensionRegistry;
    pluginMetadata?: Partial<EditorPluginMetadata>;
    extensions?: Extension[];
    testId?: string;
  } = {},
): BangleEditor {
  const container = document.body.appendChild(document.createElement('div'));
  container.setAttribute('data-testid', testId);

  const registry =
    extensionRegistry ||
    createExtensionRegistry(extensions, { editorCore: true });

  const editorProps = {
    attributes: { class: 'bangle-editor ' },
  };

  let editor = new BangleEditor(container, {
    state: new BangleEditorState({
      specRegistry: registry.specRegistry,
      plugins: () => [
        valuePlugin(EditorPluginMetadataKey, {
          wsPath: createWsPath('test:my-test.md'),
          editorDisplayType: EditorDisplayType.Page,
          editorId: PRIMARY_EDITOR_INDEX,
          dispatchSerialOperation: () => {},
          createdAt: Date.now(),
          nsmStore: {} as any,
          collabMessageBus: {} as any,
          ...pluginMetadata,
        }),
        ...registry.getPlugins(),
      ],
      editorProps,
      initialValue: node,
    }),
  });

  return editor;
}
