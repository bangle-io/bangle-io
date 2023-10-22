import { Slice } from '../slice';
import type { AnySlice } from '../types';

export function isSlice(obj: unknown): obj is AnySlice {
  return obj instanceof Slice;
}
