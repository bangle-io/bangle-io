import { describe, expect, test, vi } from 'vitest';
import { captureReportableError } from '../error-reporting-policy';
import { createAppError } from '../throw-app-error';

describe('captureReportableError', () => {
  test('captures ordinary and reportable app failures at the boundary', () => {
    const reporter = { captureException: vi.fn() };
    const ordinaryError = new Error('private message');
    const saveError = createAppError(
      'error::editor:save-failed',
      'private save message',
      { error: new Error('private cause'), wsPath: 'private:note.md' },
    );

    expect(captureReportableError(reporter, ordinaryError)).toBe(true);
    expect(captureReportableError(reporter, saveError)).toBe(true);
    expect(reporter.captureException).toHaveBeenNthCalledWith(1, ordinaryError);
    expect(reporter.captureException).toHaveBeenNthCalledWith(2, saveError);
  });

  test('does not capture expected user-facing app outcomes', () => {
    const reporter = { captureException: vi.fn() };
    const expectedError = createAppError(
      'error::workspace:no-note-opened',
      'private workspace message',
      { wsPath: 'private:note.md' },
    );

    expect(captureReportableError(reporter, expectedError)).toBe(false);
    expect(reporter.captureException).not.toHaveBeenCalled();
  });
});
