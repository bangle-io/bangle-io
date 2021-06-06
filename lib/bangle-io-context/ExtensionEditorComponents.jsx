import React from 'react';

export function ExtensionEditorComponents({
  bangleIOContext,
  wsPath,
  editorId,
}) {
  const result = bangleIOContext._extensions
    .filter((extension) => extension.EditorReactComponent)
    .map((extension) => (
      <extension.EditorReactComponent
        key={extension.name}
        wsPath={wsPath}
        editorId={editorId}
      />
    ));
  return result;
}
