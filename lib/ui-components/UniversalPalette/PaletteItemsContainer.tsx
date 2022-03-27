import React from 'react';

export function PaletteItemsContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className=""
      style={{
        overflowY: 'scroll',
      }}
    >
      {children}
    </div>
  );
}
