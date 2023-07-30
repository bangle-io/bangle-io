import { defaultPlugins } from '@bangle.dev/all-base-components';
import type { RawPlugins } from '@bangle.dev/core';
import { BangleEditor, BangleEditorState } from '@bangle.dev/core';
import type { Plugin } from '@bangle.dev/pm';
import { renderTestEditor } from '@bangle.dev/test-helpers';

import { markdownParser } from '@bangle.io/markdown';
import type { EternalVars } from '@bangle.io/shared-types';

type TestEditorOptions = {
  pluginStrategy?: 'default' | 'extension' | 'none';
  plugins?: Plugin[];
  testId?: string;
};
export function testEditor(
  eternalVars: EternalVars,
  { pluginStrategy = 'none', plugins = [] }: TestEditorOptions = {},
) {
  const finalPlugins: RawPlugins[] = [...plugins];

  if (pluginStrategy === 'default') {
    finalPlugins.push(...defaultPlugins());
  } else if (pluginStrategy === 'extension') {
    finalPlugins.push(...eternalVars.extensionRegistry.getPlugins());
  }

  const testEditor = renderTestEditor({
    specRegistry: eternalVars.extensionRegistry.specRegistry,
    plugins: finalPlugins,
  });

  return {
    renderDoc: testEditor,
  };
}

export function testEditorMarkdown(
  eternalVars: EternalVars,
  { testId, pluginStrategy = 'none', plugins = [] }: TestEditorOptions = {},
) {
  const finalPlugins: RawPlugins[] = [...plugins];

  if (pluginStrategy === 'default') {
    finalPlugins.push(...defaultPlugins());
  } else if (pluginStrategy === 'extension') {
    finalPlugins.push(...eternalVars.extensionRegistry.getPlugins());
  }

  return {
    render: (md: string) => {
      const editorProps = {
        attributes: { class: 'bangle-editor ' },
      };

      const container = document.body.appendChild(
        document.createElement('div'),
      );

      if (testId) {
        container.setAttribute('data-testid', testId);
      }

      let editor = new BangleEditor(container, {
        state: new BangleEditorState({
          specRegistry: eternalVars.extensionRegistry.specRegistry,
          plugins: finalPlugins,
          editorProps,
          initialValue: markdownParser(
            md,
            eternalVars.extensionRegistry.specRegistry,
            eternalVars.extensionRegistry.markdownItPlugins,
          ),
        }),
      });

      return {
        editor,
        container,
      };
    },
  };
}
