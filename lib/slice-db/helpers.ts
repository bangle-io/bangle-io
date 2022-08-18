import type { DbRecord } from './common';

export function makeDbRecord<V>(key: string, value: V): DbRecord<V> {
  return {
    key,
    value,
    lastModified: Date.now(),
  };
}
