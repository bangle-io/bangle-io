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
 * Writes through the real browser sync-database service so this spec pins the
 * key and encoding shared by the service write and boot-time read paths.
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

  test('reads the value written through the sync database', async () => {
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
