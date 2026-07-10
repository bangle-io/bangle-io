/**
 * The single place in the app layer that knows which package renders the
 * editing surface. Everything else in the app interacts with the editor via
 * the `editorEngine` service slot (`EditorEngineContract`).
 *
 * Known exception to the engine-agnostic seam: the surface component itself
 * is engine-specific because it renders the engine's own overlay UI (slash
 * menu, link menu, table menu, ...). This module is therefore the per-engine
 * component switch (plans/011-wordgard-editor-w-migration.md).
 */
import { useCoreServices } from '@bangle.io/context';
import { Editor as PmEditor } from '@bangle.io/editor';
import { Editor as WordgardEditor } from '@bangle.io/editor-w';
import React from 'react';

export function EditorSurface(props: {
  wsPath: string;
  name: string;
  className?: string;
}) {
  const { editorEngine } = useCoreServices();
  const Surface =
    editorEngine.engineId === 'wordgard' ? WordgardEditor : PmEditor;

  return <Surface {...props} />;
}
