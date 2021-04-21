import React, {
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
} from 'react';
import { UIManagerContext } from 'ui-context/index';
import { cx, useKeybindings } from 'utils/index';
import { CommandPalette } from './Palettes/CommandPalette';
import { InputPalette } from './Palettes/InputPalette';
import { HeadingPalette } from './Palettes/HeadingPalette';
import { WorkspacePalette } from './Palettes/WorkspacePalette';
import { FilePalette } from './Palettes/FilePalette';
import { QuestionPalette } from './Palettes/QuestionPalette';

// This is ordered -- the ones with higher rank will
// get priority over which palette shows for a given raw input query
const AllPalettes = [
  InputPalette,
  CommandPalette,
  WorkspacePalette,
  HeadingPalette,
  QuestionPalette,
  // FilePalette must be last since it matches with every
  // raw query: see its parseRawQuery method
  FilePalette,
];

export function Palette() {
  const {
    paletteMetadata,
    paletteType,
    paletteInitialQuery,
    dispatch,
    widescreen,
  } = useContext(UIManagerContext);

  const updateCounterRef = useRef();

  const [query, updateQuery] = useState(paletteInitialQuery || '');
  const updatePalette = useCallback(
    ({ type, initialQuery, metadata }) => {
      dispatch({
        type: 'UI/CHANGE_PALETTE_TYPE',
        value: { type: type, initialQuery, metadata },
      });
    },
    [dispatch],
  );

  // reset query if palette type changes
  useEffect(() => {
    updateQuery(paletteInitialQuery || '');
  }, [paletteType, paletteInitialQuery]);

  usePaletteKeybindings({ updatePalette, paletteType, updateCounterRef });

  const ActivePalette = AllPalettes.find((P) => P.type === paletteType);

  const dismissPalette = useCallback(() => {
    updatePalette({ type: null });
  }, [updatePalette]);

  // deriving the final input value helps us avoid keeping two states (paletteType, rawQuery) in sync.
  // with this there is always a a single state paletteType + query , where raw query is derived from it.
  // Note: that we are passing this callback to the children and they are free to override it.
  const parseRawQuery = useCallback(
    (rawQuery) => {
      const match = AllPalettes.find((P) => P.parseRawQuery(rawQuery) != null);
      if (!match) {
        dismissPalette();
        return;
      }

      const query = match.parseRawQuery(rawQuery);
      // if some other palette parses this query, switch to it
      if (match.type !== paletteType) {
        updatePalette({
          type: match.type,
          initialQuery: query,
        });
      } else {
        updateQuery(query);
      }
    },
    [dismissPalette, paletteType, updatePalette, updateQuery],
  );

  const showAnimationRef = useRef(true);

  useEffect(() => {
    showAnimationRef.current = !Boolean(ActivePalette);
  }, [ActivePalette]);

  if (!ActivePalette) {
    return null;
  }

  return (
    <ActivePalette.UIComponent
      query={query}
      updateQuery={updateQuery}
      paletteMetadata={paletteMetadata}
      updatePalette={updatePalette}
      dismissPalette={dismissPalette}
      AllPalettes={AllPalettes}
      paletteProps={{
        className: cx(
          showAnimationRef.current && 'fadeInScaleAnimation',
          'bangle-palette shadow-2xl',
          widescreen && 'widescreen',
        ),
        paletteIcon: (
          <span className="pr-2 flex items-center">
            <ActivePalette.PaletteIcon className="h-5 w-5" />
          </span>
        ),
        value: (ActivePalette.identifierPrefix || '') + query,
        updateValue: parseRawQuery,
        placeholder: paletteMetadata?.placeholder ?? ActivePalette.placeholder,
        dismissPalette: dismissPalette,
        updateCounterRef,
      }}
    />
  );
}

function usePaletteKeybindings({
  updatePalette,
  paletteType,
  updateCounterRef,
}) {
  useKeybindings(() => {
    return Object.fromEntries(
      Object.values(AllPalettes)
        .filter((r) => r.keybinding)
        .map((r) => [
          r.keybinding,
          () => {
            if (paletteType !== r.type) {
              updatePalette({ type: r.type });
            } else {
              // Increments the counter if the palette is already selected
              updateCounterRef.current?.((counter) => counter + 1);
            }
            return true;
          },
        ]),
    );
  }, [updatePalette, updateCounterRef, paletteType]);
}
