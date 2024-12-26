import { $suggestion } from '@bangle.io/prosemirror-plugins';
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from '@floating-ui/dom';
import { useAtomValue } from 'jotai';
import React, { useEffect, useRef, type ReactElement } from 'react';

/**
 * SlashCommand displays a floating "slash" menu when the user is inside
 * the suggestion mark that triggers the slash command.
 */
export function SlashCommand(): ReactElement | null {
  const suggestion = useAtomValue($suggestion);
  const slashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!suggestion?.show) {
      return;
    }
    const floating = slashRef.current;
    if (!floating) {
      return;
    }

    const anchor = suggestion.anchorEl();

    const boundary = document.querySelector(
      '.ProseMirror:not([contenteditable="false"])',
    );
    if (!anchor || !boundary) {
      return;
    }

    // Recompute position on scroll / resize / selection changes
    // autoUpdate will call our callback whenever it detects changes
    const cleanup = autoUpdate(anchor, floating, async () => {
      const { x, y } = await computePosition(anchor, floating, {
        strategy: 'absolute',
        placement: 'bottom-start',
        middleware: [
          offset({
            mainAxis: 8,
          }),
          flip(),
          shift({ boundary }),
        ],
      });

      Object.assign(floating.style, {
        position: 'absolute',
        left: `${Math.round(x)}px`,
        top: `${Math.round(y)}px`,
      });
    });

    return () => {
      cleanup();
    };
  }, [suggestion]);

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
        <strong>Position:</strong> {suggestion.position} <br />
        <strong>Query:</strong> {suggestion.text}
      </div>
    </div>
  );
}
