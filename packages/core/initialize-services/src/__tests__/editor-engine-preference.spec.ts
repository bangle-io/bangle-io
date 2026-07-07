// @vitest-environment happy-dom

import { atomStorageKey } from '@bangle.io/base-utils';
import {
  EDITOR_ENGINE_PREFERENCE_KEY,
  SERVICE_NAME,
} from '@bangle.io/constants';
import { BrowserLocalStorageSyncDatabaseService } from '@bangle.io/service-platform';
import { makeTestCommonOpts } from '@bangle.io/test-utils';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  EDITOR_ENGINE_PREFERENCE_STORAGE_KEY,
  readEditorEnginePreference,
  resetEditorEnginePreference,
} from '../editor-engine-preference';

/**
 * Writes the preference through the real browser sync-database service using
 * the exact call `atomStorage`'s `setItem` makes, so this spec pins the full
 * key/encoding chain between the atom write path and the boot-time reader.
 */
async function writePreferenceViaSyncDb(value: unknown) {
  const controller = new AbortController();
  const { commonOpts } = makeTestCommonOpts({ controller });
  const service = new BrowserLocalStorageSyncDatabaseService(
    {
      ctx: commonOpts,
      serviceContext: { abortSignal: commonOpts.rootAbortSignal },
    },
    null,
  );
  await service.mount();
  service.updateEntry(
    atomStorageKey(
      SERVICE_NAME.workbenchStateService,
      EDITOR_ENGINE_PREFERENCE_KEY,
    ),
    () => ({ value }),
    { tableName: 'sync' },
  );
  controller.abort();
}

describe('editor engine preference boot-time access', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('reads the value the sync database wrote for the workbench atom', async () => {
    expect(readEditorEnginePreference()).toBe('prosemirror');

    await writePreferenceViaSyncDb('wordgard');
    expect(readEditorEnginePreference()).toBe('wordgard');

    await writePreferenceViaSyncDb('prosemirror');
    expect(readEditorEnginePreference()).toBe('prosemirror');
  });

  test('unknown or corrupt values fall back to the default engine', async () => {
    await writePreferenceViaSyncDb('some-future-engine');
    expect(readEditorEnginePreference()).toBe('prosemirror');

    window.localStorage.setItem(
      EDITOR_ENGINE_PREFERENCE_STORAGE_KEY,
      'not json {',
    );
    expect(readEditorEnginePreference()).toBe('prosemirror');
  });

  test('reset forces the default engine and reports storage failures', async () => {
    await writePreferenceViaSyncDb('wordgard');
    expect(resetEditorEnginePreference()).toBe(true);
    expect(readEditorEnginePreference()).toBe('prosemirror');

    expect(
      resetEditorEnginePreference({
        setItem: () => {
          throw new Error('quota exceeded');
        },
      }),
    ).toBe(false);
  });

  test('a throwing storage read falls back to the default engine', () => {
    expect(
      readEditorEnginePreference({
        getItem: () => {
          throw new Error('storage unavailable');
        },
      }),
    ).toBe('prosemirror');
  });
});
