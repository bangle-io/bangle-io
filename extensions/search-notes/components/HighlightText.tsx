import React from 'react';

import type { HighlightTextType } from '@bangle.io/search-pm-node';

export function HighlightText({
  highlightText,
}: {
  highlightText: HighlightTextType;
}) {
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
