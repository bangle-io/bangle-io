import { describe, expect, test } from 'vitest';
import { t as german } from '../languages/de';
import { t as english } from '../languages/en';

describe.each(['omniSearch', 'pageTextSearch'] as const)(
  '%s translations',
  (section) => {
    test('German covers every English message', () => {
      expect(Object.keys(german.app?.[section] ?? {})).toEqual(
        Object.keys(english.app[section]),
      );
    });

    test.each([
      ['English', english.app[section]],
      ['German', german.app?.[section]],
    ])('%s messages are defined and non-empty', (_language, messages) => {
      expect(messages).toBeDefined();
      expect(Object.values(messages ?? {})).not.toContain('');
    });
  },
);
