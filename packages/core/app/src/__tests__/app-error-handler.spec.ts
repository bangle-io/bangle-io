import type { AppError } from '@bangle.io/types';
import { describe, expect, test } from 'vitest';
import { shouldReportAppError } from '../app-error-handler';

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
