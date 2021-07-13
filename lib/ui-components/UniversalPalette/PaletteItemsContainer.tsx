import React from 'react';

export function PaletteItemsContainer({ children }) {
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
