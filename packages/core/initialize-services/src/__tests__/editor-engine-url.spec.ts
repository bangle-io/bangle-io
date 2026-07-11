// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest';
import { readEditorEngineFromUrl } from '../initialize-services';

describe('editor engine URL selection', () => {
  test('selects a known engine from the query string', () => {
    expect(readEditorEngineFromUrl({ search: '?editorEngine=wordgard' })).toBe(
      'wordgard',
    );
    expect(
      readEditorEngineFromUrl({ search: '?editorEngine=prosemirror' }),
    ).toBe('prosemirror');
  });

  test('defaults to ProseMirror when the query value is absent or unknown', () => {
    expect(readEditorEngineFromUrl({ search: '' })).toBe('prosemirror');
    expect(
      readEditorEngineFromUrl({ search: '?editorEngine=future-engine' }),
    ).toBe('prosemirror');
  });
});
