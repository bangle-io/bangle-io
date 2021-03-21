import React, { useContext, useEffect } from 'react';
import { useState, useCallback } from 'react';
import { useKeybindings } from '../misc/hooks';
import { UIManagerContext } from '../UIManager';
import { PaletteContainer } from './PaletteContainer';

export function Palette() {
  const { paletteType, paletteInitialQuery, dispatch } = useContext(
    UIManagerContext,
  );
  const [query, updateQuery] = useState(paletteInitialQuery || '');
  const [counter, updateCounter] = useState(0);

  /**
   * Sets a flag to signal execution of whatever item
   * is currently active. It is handlers job to set it
   * back to false, to avoid infinite loop.
   */
  const [executeActiveItem, updateExecuteActiveItem] = useState(false);

  useEffect(() => {
    if (executeActiveItem) {
      updateExecuteActiveItem(false);
    }
  }, [executeActiveItem, query, counter, paletteType]);

  const updatePaletteType = useCallback(
    (val, initialQuery) => {
      dispatch({
        type: 'UI/CHANGE_PALETTE_TYPE',
        value: { type: val, initialQuery },
      });
    },
    [dispatch],
  );

  useEffect(() => {
    updateExecuteActiveItem(false);
    updateQuery(paletteInitialQuery || '');
    updateCounter(0);
  }, [paletteType, paletteInitialQuery]);

  usePaletteKeybindings({ updatePaletteType, paletteType, updateCounter });

  if (!paletteType) {
    return null;
  }

  return (
    <PaletteContainer
      updateExecuteActiveItem={updateExecuteActiveItem}
      executeActiveItem={executeActiveItem}
      updatePaletteType={updatePaletteType}
      paletteType={paletteType}
      updateCounter={updateCounter}
      updateQuery={updateQuery}
      counter={counter}
      query={query}
    />
  );
}

function usePaletteKeybindings({
  updatePaletteType,
  paletteType,
  updateCounter,
}) {
  useKeybindings(() => {
    return {
      'Mod-P': () => {
        if (paletteType === 'command') {
          updateCounter((val) => val + 1);
          return true;
        }
        updatePaletteType('command');
        return true;
      },

      'Mod-p': () => {
        if (paletteType === 'file') {
          updateCounter((val) => val + 1);
          return true;
        }
        updatePaletteType('file');
        return true;
      },

      'Ctrl-r': () => {
        console.log({ pressed: 'yes' });
        if (paletteType === 'workspace') {
          updateCounter((val) => val + 1);
          return true;
        }
        updatePaletteType('workspace');
        return true;
      },
    };
  }, [updatePaletteType, paletteType, updateCounter]);
}
