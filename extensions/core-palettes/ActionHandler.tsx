import React, { useContext, useEffect, useCallback } from 'react';
import { useUIManagerContext } from 'ui-context';
import { actionPalette } from './ActionPalette';
import { notesPalette } from './NotesPalette';
import { workspacePalette } from './WorkspacePalette';

export function ActionHandler({ registerActionHandler }) {
  const { dispatch, paletteType } = useUIManagerContext();
  const updatePalette = useCallback(
    (type) => {
      dispatch({
        type: 'UI/UPDATE_PALETTE',
        value: {
          type: paletteType === type ? null : type,
        },
      });
    },
    [dispatch, paletteType],
  );

  const actionHandler = useCallback(
    (actionObject) => {
      switch (actionObject.name) {
        case '@action/core-palettes/TOGGLE_ACTION_PALETTE': {
          updatePalette(actionPalette.type);
          return true;
        }

        case '@action/core-palettes/TOGGLE_WORKSPACE_PALETTE': {
          updatePalette(workspacePalette.type);
          return true;
        }

        case '@action/core-palettes/TOGGLE_NOTES_PALETTE': {
          updatePalette(notesPalette.type);
          return true;
        }

        default: {
          return false;
        }
      }
    },
    [updatePalette],
  );

  useEffect(() => {
    const deregister = registerActionHandler((obj) => {
      actionHandler(obj);
    });
    return () => {
      deregister();
    };
  }, [actionHandler, registerActionHandler]);

  return null;
}
