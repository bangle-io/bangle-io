import React from 'react';

import type { HighlightTextType } from '@bangle.io/search-pm-node';

export function HighlightText({
  highlightText,
}: {
  highlightText: HighlightTextType;
}) {
  return (
    <div className="B-search-notes_highlight-text-container">
      {highlightText.map((t, i) => (
        <span key={i} className="B-search-notes_highlight-text text-sm">
          {t}
        </span>
      ))}
    </div>
  );
}
