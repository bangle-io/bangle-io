import React from 'react';

export function PaletteItemsContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="universal-palette-items-container"
      style={{
        overflowY: 'scroll',
      }}
    >
      {children}
    </div>
  );
}
