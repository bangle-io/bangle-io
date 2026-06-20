import { describe, expect, it, vi } from 'vitest';
import { connectSaveProtection } from '../save-protection';

describe('connectSaveProtection', () => {
  it('tracks pending or failed saves and clears protection after success', () => {
    let dirty = false;
    let listener: (() => void) | undefined;
    const unsubscribe = vi.fn();
    const setUnsavedChanges = vi.fn();
    const cleanup = connectSaveProtection(
      {
        hasPendingOrFailedSave: () => dirty,
        subscribeToSaveStatus: (nextListener) => {
          listener = nextListener;
          return unsubscribe;
        },
      },
      { setUnsavedChanges },
    );

    expect(setUnsavedChanges).toHaveBeenLastCalledWith(false);

    dirty = true;
    listener?.();
    expect(setUnsavedChanges).toHaveBeenLastCalledWith(true);

    dirty = false;
    listener?.();
    expect(setUnsavedChanges).toHaveBeenLastCalledWith(false);

    cleanup();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(setUnsavedChanges).toHaveBeenLastCalledWith(false);
  });
});
