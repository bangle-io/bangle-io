// @vitest-environment happy-dom

import { makeTestLogger } from '@bangle.io/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGithubUrl } from '../github-bug-url';
import { throwAppError } from '../throw-app-error';

describe('getGithubUrl', () => {
  let logger = makeTestLogger().logger;

  beforeEach(() => {
    vi.clearAllMocks();
    ({ logger } = makeTestLogger());
  });

  it('should generate a GitHub URL with error details', () => {
    const error = new Error('Test error');
    error.stack = 'Error stack trace';

    const url = getGithubUrl(error, logger);

    const search = new URL(url).searchParams;
    expect(search.get('body')).toContain('Details');
    expect(search.get('body')).toContain('Test error');
  });

  it('should include app error', () => {
    let error: Error | undefined;

    try {
      throwAppError('error::ws-path:invalid-ws-path', 'Test error message', {
        invalidPath: 'test-path',
      });
    } catch (e) {
      if (e instanceof Error) {
        error = e;
      }
    }

    if (!error) {
      throw new Error('Failed to throw app error');
    }

    const url = getGithubUrl(error, logger);
    const search = new URL(url).searchParams;
    expect(search.get('body')).toContain('BaseError: Test error');
    expect(search.get('body')).toContain('Test error message');
    expect(search.get('body')).toContain('test-path');
  });
});
