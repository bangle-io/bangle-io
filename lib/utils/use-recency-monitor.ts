import { useCallback } from 'react';

import { useLocalStorage } from './use-local-storage';

export type RecencyRecords = Array<{ key: string; timestamps: number[] }>;

const EMPTY_ARRAY: RecencyRecords = [];
/**
 *
 * A hook for monitoring strings recently used. It persists data
 * in local storage with the help of useLocalStorage
 *
 * @param param0
 * @param param0.uid - This hook saves things in localstorage,
 *                    so the uid prevents clashing from other records of this hook.
 * @returns List of recorded sorted descending order with most recently used first and least recently used at last
 */
export function useRecencyMonitor({
  uid,
  maxTimestampsPerEntry = 3,
  maxEntries = 25,
}: {
  uid: string;
  maxTimestampsPerEntry?: number;
  maxEntries?: number;
}) {
  const [records, save] = useLocalStorage<RecencyRecords>(
    'utils/useRecencyMonitor-1/' + uid,
    EMPTY_ARRAY,
  );

  return {
    records: records,
    updateRecord: useCallback(
      (key: string) => {
        save((prevValue) => {
          let records = updateRecords(prevValue, key, maxTimestampsPerEntry);
          records = trimRecords(records, maxEntries);

          return records;
        });
      },
      [save, maxTimestampsPerEntry, maxEntries],
    ),
  };
}

export function updateTimestamps(
  row: RecencyRecords[0]['timestamps'],
  maxTimestampsPerEntry: number,
): RecencyRecords[0]['timestamps'] {
  const timestamp = Date.now();
  const currentRow = [timestamp, ...row]
    .filter((r) => typeof r === 'number')
    .sort((a, b) => b - a);

  return currentRow.slice(0, maxTimestampsPerEntry);
}

export function updateRecords(
  records: RecencyRecords,
  key: string,
  maxTimestampsPerEntry: number,
): RecencyRecords {
  const currentTimestamps =
    records.find((r) => r.key === key)?.timestamps || [];
  const other = records.filter((r) => r.key !== key);
  const newRow = updateTimestamps(currentTimestamps, maxTimestampsPerEntry);

  return [{ key: key, timestamps: newRow }, ...other];
}

export function trimRecords(
  records: RecencyRecords,
  maxEntries: number,
): RecencyRecords {
  return records
    .sort((a, b) => {
      const timestampA = a.timestamps[0] || 0;
      const timestampB = b.timestamps[0] || 0;

      return timestampB - timestampA;
    })
    .slice(0, maxEntries);
}
