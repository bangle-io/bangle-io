/**
 * The single place in the app layer that knows which package renders the
 * editing surface. Everything else in the app interacts with the editor via
 * the `editorEngine` service slot (`EditorEngineContract`).
 *
 * Known exception to the engine-agnostic seam: the surface component itself
 * is engine-specific because it renders the engine's own overlay UI (slash
 * menu, link menu, table menu, ...). This module is therefore the per-engine
 * component switch (plans/011-wordgard-editor-w-migration.md). Both surfaces
 * are lazy so a tab only ever downloads and parses the active engine's stack
 * — the composition root applies the same rule to the engine services.
 */
import { useCoreServices } from '@bangle.io/context';
import React, { lazy, Suspense } from 'react';

const PmEditor = lazy(() =>
  import('@bangle.io/editor').then((mod) => ({ default: mod.Editor })),
);
const WordgardEditor = lazy(() =>
  import('@bangle.io/editor-w').then((mod) => ({ default: mod.Editor })),
);

export function EditorSurface(props: {
  wsPath: string;
  name: string;
  className?: string;
}) {
  const { editorEngine } = useCoreServices();
  const Surface =
    editorEngine.engineId === 'wordgard' ? WordgardEditor : PmEditor;

  return (
    <Suspense fallback={null}>
      <Surface {...props} />
    </Suspense>
  );
}
