import React, { useEffect, useRef, useCallback, useState } from 'react';

export function HighlightText({ highlightText }: { highlightText: string[] }) {
  return (
    <div className="highlight-text-container">
      {highlightText.map((t, i) => (
        <span key={i} className="highlight-text text-sm">
          {t}
        </span>
      ))}
    </div>
  );
}
