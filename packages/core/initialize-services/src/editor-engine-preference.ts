import { atomStorageKey } from '@bangle.io/base-utils';
import {
  DEFAULT_EDITOR_ENGINE,
  EDITOR_ENGINE_PREFERENCE_KEY,
  type EditorEngineId,
  isEditorEngineId,
  SERVICE_NAME,
} from '@bangle.io/constants';
import { BrowserLocalStorageSyncDatabaseService } from '@bangle.io/service-platform';

/**
 * Where the browser sync database persists the editor-engine preference.
 * Composed from the same helpers as the write path so the two cannot drift.
 */
export const EDITOR_ENGINE_PREFERENCE_STORAGE_KEY =
  BrowserLocalStorageSyncDatabaseService.storageKeyFor(
    atomStorageKey(
      SERVICE_NAME.workbenchStateService,
      EDITOR_ENGINE_PREFERENCE_KEY,
    ),
    'sync',
  );

/**
 * Reads the persisted editor-engine preference before any service exists.
 * The composition root must pick an engine id prior to container
 * instantiation, so this reads the sync database's localStorage entry
 * directly. Unknown or corrupt values fall back to the default engine —
 * a bad preference must never be able to prevent boot.
 */
export function readEditorEnginePreference(
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): EditorEngineId {
  try {
    const raw = storage.getItem(EDITOR_ENGINE_PREFERENCE_STORAGE_KEY);
    if (raw === null) {
      return DEFAULT_EDITOR_ENGINE;
    }
    const parsed: unknown = JSON.parse(raw);
    return isEditorEngineId(parsed) ? parsed : DEFAULT_EDITOR_ENGINE;
  } catch {
    return DEFAULT_EDITOR_ENGINE;
  }
}

/**
 * Boot-guard escape hatch: forces the preference back to the default engine
 * so the next boot cannot re-enter a failing experimental engine. Written in
 * the same JSON encoding the sync database uses. Returns false when storage
 * itself is unusable (the caller should then fall through to the normal
 * startup-error surface instead of reload-looping).
 */
export function resetEditorEnginePreference(
  storage: Pick<Storage, 'setItem'> = window.localStorage,
): boolean {
  try {
    storage.setItem(
      EDITOR_ENGINE_PREFERENCE_STORAGE_KEY,
      JSON.stringify(DEFAULT_EDITOR_ENGINE),
    );
    return true;
  } catch {
    return false;
  }
}
