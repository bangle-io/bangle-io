import React from 'react';
import { useWorkspacePath } from 'workspace-context/index';

export function LocationBreadCrumb() {
  let { filePath } = useWorkspacePath();
  const items = (filePath || '').split('/');
  return (
    <div
      className="sticky top-0 z-10 pl-2 py-1 shadow"
      style={{ backgroundColor: 'var(--bg-stronger-color)' }}
    >
      {items.flatMap((r, i) => [
        <span key={i}>{r}</span>,
        i !== items.length - 1 ? (
          <span className="px-1" key={i + 'arrow'}>
            {'>'}
          </span>
        ) : null,
      ])}
    </div>
  );
}
