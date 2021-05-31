import React from 'react';

export function ExtensionEditorComponents({ bangleIOContext }) {
  const result = bangleIOContext._extensions
    .filter((extension) => extension.EditorReactComponent)
    .map((extension) => (
      <extension.EditorReactComponent key={extension.name} />
    ));
  return result;
}
