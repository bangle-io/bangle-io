import { useCallback, useEffect } from 'react';

import {
  CORE_PALETTES_TOGGLE_ACTION_PALETTE,
  CORE_PALETTES_TOGGLE_NOTES_PALETTE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
} from '@bangle.io/constants';
import { useUIManagerContext } from '@bangle.io/ui-context';

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
        case CORE_PALETTES_TOGGLE_ACTION_PALETTE: {
          updatePalette(actionPalette.type);
          return true;
        }

        case CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE: {
          updatePalette(workspacePalette.type);
          return true;
        }

        case CORE_PALETTES_TOGGLE_NOTES_PALETTE: {
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
