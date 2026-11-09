import { describe, expect, test } from 'vitest';
import { t as german } from '../languages/de';
import { t as english } from '../languages/en';

describe('omni search translations', () => {
  test('German covers every English Omni Search message', () => {
    expect(Object.keys(german.app?.omniSearch ?? {})).toEqual(
      Object.keys(english.app.omniSearch),
    );
  });

  test.each([
    ['English', english.app.omniSearch],
    ['German', german.app?.omniSearch],
  ])('%s messages are non-empty strings', (_language, messages) => {
    expect(messages).toBeDefined();
    expect(Object.values(messages ?? {})).not.toContain('');
    expect(Object.values(messages ?? {})).toHaveLength(8);
  });
});
