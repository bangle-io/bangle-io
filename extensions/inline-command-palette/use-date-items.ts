import { useEffect, useMemo, useRef, useState } from 'react';

import { replaceSuggestionMarkWith } from '@bangle.io/inline-palette';
import type { UnPromisify } from '@bangle.io/shared-types';
import { getDayJs, useDestroyRef } from '@bangle.io/utils';

import { palettePluginKey } from './config';
import { PALETTE_ITEM_HINT_TYPE, PaletteItem } from './palette-item';

const OneDayMilliseconds = 24 * 60 * 60 * 1000;

const prettyPrintDate = (dayjs: any, date: any) => {
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

type ChronoLibrariesType = UnPromisify<ReturnType<typeof getTimeLibrary>>;
let _libraries:
  | undefined
  | {
      chrono: typeof import('chrono-node');
      dayjs: UnPromisify<ReturnType<typeof getDayJs>>;
    } = undefined;
async function getTimeLibrary() {
  if (!_libraries) {
    let [chrono, dayjs] = (await Promise.all([
      import('chrono-node'),
      getDayJs(),
    ])) as any;

    chrono = chrono.default || chrono;

    _libraries = { chrono, dayjs: dayjs };
  }

  return _libraries;
}

export function useDateItems(query: string) {
  const [parsedDateObj, updateParsedDate] = useState<
    | undefined
    | {
        parsedDates: any;
        chrono: any;
        dayjs: any;
      }
  >(undefined);
  const [chronoLoadStatus, updateChronoStatus] = useState<
    'loaded' | 'loading' | 'not-started'
  >('not-started');
  const chronoRef = useRef<ChronoLibrariesType | undefined>();
  const destroyedRef = useDestroyRef();

  const items = useMemo(() => {
    if (parsedDateObj) {
      const { parsedDates, dayjs } = parsedDateObj;

      return parsedDates.map((p: any, i: number) =>
        PaletteItem.create({
          uid: 'parsedDate' + i,
          highPriority: true,
          skipFiltering: true,
          title: 'Insert date',
          group: 'date',
          description: 'Insert "' + prettyPrintDate(dayjs, p.date()) + '"',
          editorExecuteCommand: () => {
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
    if (query && chronoLoadStatus === 'not-started') {
      updateChronoStatus('loading');
      getTimeLibrary()
        .then((obj) => {
          if (destroyedRef.current) {
            return;
          }
          chronoRef.current = obj;
          updateChronoStatus('loaded');
        })
        .catch((error) => {
          if (destroyedRef.current) {
            return;
          }
          updateChronoStatus('not-started');
          throw error;
        });
    }
  }, [query, chronoLoadStatus, updateChronoStatus, destroyedRef]);

  useEffect(() => {
    if (query && chronoLoadStatus === 'loaded' && chronoRef.current) {
      const { chrono, dayjs } = chronoRef.current;
      let startOfDay = dayjs().startOf('day').toDate();
      const parsedDates = chrono.parse(query, startOfDay);

      if (parsedDates.length > 0) {
        updateParsedDate({ parsedDates, chrono, dayjs });
      } else {
        updateParsedDate(undefined);
      }
    }
  }, [query, chronoLoadStatus]);

  useEffect(() => {
    // reset state if query is undefined
    if (query === '' && parsedDateObj) {
      updateParsedDate(undefined);
    }
  }, [query, parsedDateObj]);

  return items;
}
