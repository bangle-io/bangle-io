import { BangleEditor, BangleEditorState } from '@bangle.dev/core';

import { Extension } from '@bangle.io/extension-registry';
import { markdownParser } from '@bangle.io/markdown';

import { createExtensionRegistry } from './extension-registry';

/**
 * Creates an editor from markdown string
 */
export function createEditorFromMd(
  md: string,
  {
    extensions = [],
    testId = 'test-editor',
  }: {
    extensions?: Extension[];
    testId?: string;
  } = {},
) {
  md = md.trim();
  const container = document.body.appendChild(document.createElement('div'));
  container.setAttribute('data-testid', testId);

  const registry = createExtensionRegistry(extensions, { editorCore: true });

  const editorProps = {
    attributes: { class: 'bangle-editor ' },
  };

  let editor = new BangleEditor(container, {
    state: new BangleEditorState({
      specRegistry: registry.specRegistry,
      plugins: () => registry.getPlugins(),
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
