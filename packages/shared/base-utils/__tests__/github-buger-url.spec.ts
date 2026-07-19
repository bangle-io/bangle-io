// @vitest-environment happy-dom

import { makeTestLogger } from '@bangle.io/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGithubUrl } from '../github-bug-url';

describe('getGithubUrl', () => {
  let logger = makeTestLogger().logger;

  beforeEach(() => {
    vi.clearAllMocks();
    ({ logger } = makeTestLogger());
  });

  it('generates a GitHub URL with only privacy-safe diagnostics', () => {
    const error = new TypeError('PRIVATE_NOTE_CONTENT');
    error.stack =
      'TypeError: PRIVATE_NOTE_CONTENT\n    at save (https://app.bangle.io/assets/index-abcdef12.js?wsPath=PRIVATE_WORKSPACE:PRIVATE_NOTE.md:10:20)';

    const url = getGithubUrl(error, logger);

    const search = new URL(url).searchParams;
    expect(search.get('body')).toContain('Privacy-safe diagnostics');
    expect(search.get('body')).toContain('TypeError');
    expect(search.get('body')).toContain('/assets/index.js:10:20');
    expect(search.get('body')).not.toContain('PRIVATE_NOTE_CONTENT');
    expect(search.get('body')).not.toContain('PRIVATE_WORKSPACE');
    expect(search.get('body')).not.toContain('PRIVATE_NOTE.md');
  });

  it('does not include custom error names, causes, or properties', () => {
    const error = new Error('PRIVATE_MESSAGE', {
      cause: new Error('PRIVATE_CAUSE'),
    });
    error.name = 'PRIVATE_ERROR_NAME';
    Object.assign(error, { wsPath: 'PRIVATE_WORKSPACE:PRIVATE_NOTE.md' });
    const url = getGithubUrl(error, logger);
    const search = new URL(url).searchParams;
    const body = search.get('body');
    expect(body).toContain('**Error type:** Error');
    expect(body).not.toContain('PRIVATE_MESSAGE');
    expect(body).not.toContain('PRIVATE_CAUSE');
    expect(body).not.toContain('PRIVATE_ERROR_NAME');
    expect(body).not.toContain('PRIVATE_WORKSPACE');
  });
});
