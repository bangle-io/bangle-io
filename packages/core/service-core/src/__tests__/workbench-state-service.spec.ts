import { atomStorageKey } from '@bangle.io/base-utils';
import {
  DEFAULT_EDITOR_ENGINE,
  EDITOR_ENGINE_PREFERENCE_KEY,
  SERVICE_NAME,
} from '@bangle.io/constants';
import { createTestEnvironment } from '@bangle.io/test-utils';
import { describe, expect, it, vi } from 'vitest';

const editorEngineStorageKey = atomStorageKey(
  SERVICE_NAME.workbenchStateService,
  EDITOR_ENGINE_PREFERENCE_KEY,
);

describe('WorkbenchStateService editor engine preference', () => {
  it('updates the mounted atom only after the preference is persisted', async () => {
    const testEnv = createTestEnvironment();
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();

    expect(testEnv.store.get(services.workbenchState.$editorEngine)).toBe(
      DEFAULT_EDITOR_ENGINE,
    );

    expect(
      services.workbenchState.changeEditorEnginePreference('wordgard'),
    ).toBe(true);
    expect(
      services.syncDatabase.getEntry(editorEngineStorageKey, {
        tableName: 'sync',
      }),
    ).toEqual({ found: true, value: 'wordgard' });
    expect(testEnv.store.get(services.workbenchState.$editorEngine)).toBe(
      'wordgard',
    );

    testEnv.controller.abort();
  });

  it('keeps the running preference unchanged when persistence throws', async () => {
    const testEnv = createTestEnvironment();
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();
    vi.spyOn(services.syncDatabase, 'updateEntry').mockImplementation(() => {
      throw new Error('storage quota exceeded');
    });

    expect(
      services.workbenchState.changeEditorEnginePreference('wordgard'),
    ).toBe(false);
    expect(testEnv.store.get(services.workbenchState.$editorEngine)).toBe(
      DEFAULT_EDITOR_ENGINE,
    );
    expect(
      services.syncDatabase.getEntry(editorEngineStorageKey, {
        tableName: 'sync',
      }),
    ).toEqual({ found: false, value: undefined });

    testEnv.controller.abort();
  });

  it('accepts a confirmed durable write when only notification fails', async () => {
    const testEnv = createTestEnvironment();
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();
    const updateEntry = services.syncDatabase.updateEntry.bind(
      services.syncDatabase,
    );
    vi.spyOn(services.syncDatabase, 'updateEntry').mockImplementation(
      (key, update, options) => {
        updateEntry(key, update, options);
        throw new Error('broadcast channel closed');
      },
    );

    expect(
      services.workbenchState.changeEditorEnginePreference('wordgard'),
    ).toBe(true);
    expect(
      services.syncDatabase.getEntry(editorEngineStorageKey, {
        tableName: 'sync',
      }),
    ).toEqual({ found: true, value: 'wordgard' });

    testEnv.controller.abort();
  });
});
