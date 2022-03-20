import React from 'react';

export function LocationBreadCrumb({ filePath }: { filePath: string }) {
  const items = (filePath || '').split('/');

  return (
    <div className="z-10 w-full py-1 pl-2">
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
