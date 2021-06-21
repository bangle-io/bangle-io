import React from 'react';

export function MagicPaletteItemsContainer({ children }) {
  return (
    <div
      className="magic-palette-items-container"
      style={{
        overflowY: 'scroll',
      }}
    >
      {children}
    </div>
  );
}
