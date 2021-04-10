import React from 'react';

export function LocationBreadCrumb({ filePath }) {
  const items = (filePath || '').split('/');
  return (
    <div className="w-full z-10 pl-2 py-1">
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
