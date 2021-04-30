import { useEffect, useMemo, useState } from 'react';
import { replaceSuggestionMarkWith } from 'inline-palette/index';
import { palettePluginKey } from './config';
import { useDestroyRef } from 'utils/index';

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
const baseItem = {
  uid: 'date',
  title: 'Insert date',
  description: 'Use natural language like "tomorrow", "next friday 3pm" etc',
  keywords: ['date', 'time'],
  disabled: true,
  editorExecuteCommand: ({}) => {
    // return replaceSuggestionMarkWith(palettePluginKey, getDate(type));
  },
};

let _libraries;
async function getTimeLibrary() {
  if (!_libraries) {
    let [chrono, dayjs, localizedFormat] = await Promise.all([
      import('chrono-node'),
      import('dayjs'),
      import('dayjs/plugin/localizedFormat'),
    ]);

    chrono = chrono.default || chrono;
    dayjs = dayjs.default || dayjs;
    localizedFormat = localizedFormat.default || localizedFormat;

    dayjs.extend(localizedFormat);
    _libraries = { chrono: chrono, dayjs: dayjs };
  }
  return _libraries;
}

export function useDateItems(query) {
  const [parsedDateObj, updateParsedDate] = useState(null);
  const destroyedRef = useDestroyRef();

  const items = useMemo(() => {
    if (query === '') {
      return [baseItem];
    }
    if (parsedDateObj) {
      const { parsedDates, dayjs } = parsedDateObj;
      return parsedDates.map((p, i) => ({
        uid: 'parsedDate' + i,
        show: true,
        title: 'Insert date',
        description: 'Insert "' + prettyPrintDate(dayjs, p.date()) + '"',
        editorExecuteCommand: ({}) => {
          return replaceSuggestionMarkWith(
            palettePluginKey,
            prettyPrintDate(dayjs, p.date()) + ' ',
          );
        },
      }));
    }
    return [];
  }, [query, parsedDateObj]);

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
