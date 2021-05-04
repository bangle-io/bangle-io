import { useEffect, useMemo, useState } from 'react';
import { replaceSuggestionMarkWith } from 'inline-palette/index';
import { palettePluginKey } from './config';
import { getDayJs, useDestroyRef } from 'utils/index';
import { PaletteItem, PALETTE_ITEM_HINT_TYPE } from './palette-item';

const OneDayMilliseconds = 24 * 60 * 60 * 1000;

const prettyPrintDate = (dayjs, date) => {
  const dayjsInputDate = dayjs(date);
  const startOfDay = dayjsInputDate.startOf('day');

  // shorten the display if it doesnt have hours
  if (
    dayjsInputDate.diff(startOfDay) === 0 ||
    // TODO chrono parses dates without time with 12pm
    // we can figure out later if there is a way to see
    // if user actually put in hours.
    dayjsInputDate.diff(startOfDay) === OneDayMilliseconds / 2
  ) {
    return dayjsInputDate.format('ll');
  }
  return dayjsInputDate.format('ll LT');
};
const baseItem = PaletteItem.create({
  uid: 'date',
  type: PALETTE_ITEM_HINT_TYPE,
  title: 'Insert date',
  description: `You can type things like '/tomorrow', '/next friday 3pm', '/sep 23'`,
  keywords: ['date', 'time'],
  group: 'date',
  disabled: true,
  editorExecuteCommand: ({}) => {
    // return replaceSuggestionMarkWith(palettePluginKey, getDate(type));
  },
});

let _libraries;
async function getTimeLibrary() {
  if (!_libraries) {
    let [chrono, dayjs] = await Promise.all([
      import('chrono-node'),
      getDayJs(),
    ]);

    chrono = chrono.default || chrono;

    _libraries = { chrono: chrono, dayjs: dayjs };
  }
  return _libraries;
}

export function useDateItems(query) {
  const [parsedDateObj, updateParsedDate] = useState(null);
  const destroyedRef = useDestroyRef();

  const items = useMemo(() => {
    if (parsedDateObj) {
      const { parsedDates, dayjs } = parsedDateObj;
      return parsedDates.map((p, i) =>
        PaletteItem.create({
          uid: 'parsedDate' + i,
          highPriority: true,
          skipFiltering: true,
          title: 'Insert date',
          group: 'date',
          description: 'Insert "' + prettyPrintDate(dayjs, p.date()) + '"',
          editorExecuteCommand: ({}) => {
            return replaceSuggestionMarkWith(
              palettePluginKey,
              prettyPrintDate(dayjs, p.date()) + ' ',
            );
          },
        }),
      );
    }
    return [baseItem];
  }, [parsedDateObj]);

  useEffect(() => {
    if (query) {
      getTimeLibrary().then((obj) => {
        if (destroyedRef.current) {
          return;
        }
        const { chrono, dayjs } = obj;
        const parsedDates = chrono.parse(query, dayjs().startOf('day'));
        if (parsedDates.length > 0) {
          updateParsedDate({ parsedDates, chrono, dayjs });
        } else {
          updateParsedDate(undefined);
        }
      });
    }
  }, [query, destroyedRef]);

  useEffect(() => {
    // reset state if query is undefined
    if (query === '' && parsedDateObj) {
      updateParsedDate(undefined);
    }
  }, [query, parsedDateObj]);
  return items;
}

// function insertDateCommand(type) {
//   return (state, dispatch, view) => {
//     rafCommandExec(view, (state, dispatch, view) => {
//       dispatch?.(state.tr.replaceSelectionWith(state.schema.text(' ')));
//     });
//     return replaceSuggestionMarkWith(palettePluginKey, getDate(type))(
//       state,
//       dispatch,
//       view,
//     );
//   };
// }
