import { atomStorageKey } from '@bangle.io/base-utils';
import {
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
  it('persists the selected engine', async () => {
    const testEnv = createTestEnvironment();
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();

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

  it('reports a persistence failure', async () => {
    const testEnv = createTestEnvironment();
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();
    vi.spyOn(services.syncDatabase, 'updateEntry').mockImplementation(() => {
      throw new Error('storage quota exceeded');
    });

    expect(
      services.workbenchState.changeEditorEnginePreference('wordgard'),
    ).toBe(false);
    expect(
      services.syncDatabase.getEntry(editorEngineStorageKey, {
        tableName: 'sync',
      }),
    ).toEqual({ found: false, value: undefined });

    testEnv.controller.abort();
  });
});
