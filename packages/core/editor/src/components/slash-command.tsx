import { suggestions } from '@bangle.io/prosemirror-plugins';
import { useAtomValue, useSetAtom } from 'jotai';
import React, { useEffect, type ReactElement } from 'react';
import { useFloatingPosition } from './use-floating-position';

/**
 * SlashCommand displays a floating "slash" menu when the user is inside
 * the suggestion mark that triggers the slash command.
 */
export function SlashCommand(): ReactElement | null {
  const suggestion = useAtomValue(suggestions.$suggestion);
  const markName = suggestion?.markName;
  const setSuggestionUi = useSetAtom(suggestions.$suggestionUi);

  useEffect(() => {
    if (!markName) {
      return;
    }

    setSuggestionUi((existing) => ({
      ...existing,
      [markName]: {
        onSelect: (index) => {
          console.log('onSelect', index);
        },
      },
    }));

    return () => {
      setSuggestionUi((existing) => {
        const cloned = { ...existing };
        delete cloned[markName];

        return cloned;
      });
    };
  }, [markName, setSuggestionUi]);

  const slashRef = useFloatingPosition({
    show: Boolean(suggestion?.show),
    anchorEl: () => suggestion?.anchorEl() ?? null,
    boundarySelector: '.ProseMirror:not([contenteditable="false"])',
  });

  if (!suggestion?.show) {
    return null;
  }

  return (
    <div
      ref={slashRef}
      style={{
        backgroundColor: 'green',
        padding: '4px 8px',
        borderRadius: 4,
        position: 'absolute',
        left: 0,
        top: 0,
      }}
    >
      <div style={{ color: 'white', fontSize: 14 }}>
        <strong>Position:</strong> {suggestion.position}{' '}
        {suggestion.selectedIndex}
        <br />
        <strong>Query:</strong> {suggestion.text}
      </div>
    </div>
  );
}
