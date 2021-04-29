import React from 'react';

export function EditorComponents({ bangleIOContext }) {
  const result = bangleIOContext._extensions
    .filter((extension) => extension.editorReactComponent)
    .map((extension) => (
      <extension.editorReactComponent key={extension.name} />
    ));
  return result;
}
