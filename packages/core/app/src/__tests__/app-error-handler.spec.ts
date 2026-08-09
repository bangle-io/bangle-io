import type { EditorSavePhase } from '@bangle.io/context';
import type { AppError } from '@bangle.io/types';
import { describe, expect, test, vi } from 'vitest';
import {
  createSaveFailureToastManager,
  shouldReportAppError,
} from '../app-error-handler';

describe('shouldReportAppError', () => {
  test.each([
    {
      appError: {
        name: 'error::editor:save-failed',
        payload: { error: new Error('write failed'), wsPath: 'test:note.md' },
      } satisfies AppError,
      expected: true,
    },
    {
      appError: {
        name: 'error::database:unknown-error',
        payload: { databaseName: 'test-db', error: new Error('idb failed') },
      } satisfies AppError,
      expected: true,
    },
    {
      appError: {
        name: 'error::workspace:invalid-metadata',
        payload: { wsName: 'notes' },
      } satisfies AppError,
      expected: true,
    },
    {
      appError: {
        name: 'error::workspace:no-note-opened',
        payload: {},
      } satisfies AppError,
      expected: false,
    },
    {
      appError: {
        name: 'error::workspace:native-fs-auth-needed',
        payload: { wsName: 'notes' },
      } satisfies AppError,
      expected: false,
    },
    {
      appError: {
        name: 'error::workspace:native-fs-reconnect-failed',
        payload: { wsName: 'notes' },
      } satisfies AppError,
      expected: false,
    },
    {
      appError: {
        name: 'error::workspace:native-fs-locate-failed',
        payload: { wsName: 'notes' },
      } satisfies AppError,
      expected: false,
    },
    {
      appError: {
        name: 'error::file:already-existing',
        payload: { wsPath: 'notes:existing.md' },
      } satisfies AppError,
      expected: false,
    },
    {
      appError: {
        name: 'error::file-storage:file-does-not-exist',
        payload: { storage: 'file-storage-nativefs', wsPath: 'notes:' },
      } satisfies AppError,
      expected: false,
    },
  ])('returns $expected for $appError.name', ({ appError, expected }) => {
    expect(shouldReportAppError(appError)).toBe(expected);
  });
});

describe('createSaveFailureToastManager', () => {
  test('dismisses and unsubscribes when the exact path leaves failed', () => {
    const phases = new Map<string, EditorSavePhase>([
      ['test:note.md', 'failed'],
      ['test:other.md', 'failed'],
    ]);
    const listeners = new Map<string, Set<() => void>>();
    const retries: string[] = [];
    const source = {
      getSaveStatus: (wsPath: string) => phases.get(wsPath) ?? 'clean',
      retryFailedSave: (wsPath?: string) => {
        if (wsPath === undefined) {
          return false;
        }
        retries.push(wsPath);
        return true;
      },
      subscribeToSaveStatus: (listener: () => void, wsPath?: string) => {
        if (wsPath === undefined) {
          throw new Error('Expected an exact-path subscription');
        }
        const pathListeners = listeners.get(wsPath) ?? new Set();
        pathListeners.add(listener);
        listeners.set(wsPath, pathListeners);
        return () => {
          pathListeners.delete(listener);
        };
      },
    };
    const target = {
      dismiss: vi.fn<(wsPath: string) => void>(),
      show: vi.fn<(wsPath: string, retry: () => void) => void>(),
    };
    const manager = createSaveFailureToastManager(source, target);

    manager.show('test:note.md');
    expect(target.show).toHaveBeenCalledTimes(1);
    expect(listeners.get('test:note.md')?.size).toBe(1);

    const retry = target.show.mock.calls[0]?.[1];
    if (!retry) {
      throw new Error('Expected the toast retry action');
    }
    retry();
    expect(retries).toEqual(['test:note.md']);
    expect(target.dismiss).not.toHaveBeenCalled();

    // A different note changing cannot resolve this toast.
    phases.set('test:other.md', 'clean');
    for (const listener of listeners.get('test:other.md') ?? []) {
      listener();
    }
    expect(target.dismiss).not.toHaveBeenCalled();

    phases.set('test:note.md', 'pending');
    for (const listener of listeners.get('test:note.md') ?? []) {
      listener();
    }
    expect(target.dismiss).toHaveBeenCalledWith('test:note.md');
    expect(listeners.get('test:note.md')?.size).toBe(0);
  });

  test('does not show a stale failure and cleans up active toasts on dispose', () => {
    let phase: EditorSavePhase = 'clean';
    const unsubscribe = vi.fn();
    const target = {
      dismiss: vi.fn<(wsPath: string) => void>(),
      show: vi.fn<(wsPath: string, retry: () => void) => void>(),
    };
    const manager = createSaveFailureToastManager(
      {
        getSaveStatus: () => phase,
        retryFailedSave: () => false,
        subscribeToSaveStatus: () => unsubscribe,
      },
      target,
    );

    manager.show('test:clean.md');
    expect(target.show).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalledTimes(1);

    phase = 'failed';
    manager.show('test:failed.md');
    expect(target.show).toHaveBeenCalledTimes(1);

    manager.dispose();
    expect(unsubscribe).toHaveBeenCalledTimes(2);
    expect(target.dismiss).toHaveBeenCalledWith('test:failed.md');
  });
});
