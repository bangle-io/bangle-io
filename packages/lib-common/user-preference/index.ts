import { z } from 'zod';

import { APP_ERROR_NAME, throwAppError } from '@bangle.io/app-errors';
import { COLOR_SCHEME } from '@bangle.io/constants';
import { safeJSONParse, safeJSONStringify } from '@bangle.io/safe-json';
import type { AppDatabase } from '@bangle.io/shared-types';

import { PREFER_SYSTEM_COLOR_SCHEME } from './constants';
import { logger } from './logger';

export type UserPreferenceConfig = {
  database: AppDatabase;
  onChange?: (change: UserPreference) => void;
};

export const DB_KEY = 'userPreference';

// ensure all fields are optional for backwards compatibility and future proofing
const userPreferenceSchema = z.object({
  version: z.optional(z.number()),
  themePreference: z.optional(
    z.union([
      z.literal(COLOR_SCHEME.LIGHT),
      z.literal(COLOR_SCHEME.DARK),
      z.literal(PREFER_SYSTEM_COLOR_SCHEME),
    ]),
  ),
});

type MakeRequired<T> = {
  [P in keyof T]-?: T[P];
};

type UserPreferenceOptional = z.infer<typeof userPreferenceSchema>;
type UserPreference = MakeRequired<UserPreferenceOptional>;

export const defaultUserPreference: UserPreference = {
  themePreference: PREFER_SYSTEM_COLOR_SCHEME,
  version: 1,
};

export class UserPreferenceManager {
  constructor(private config: UserPreferenceConfig) {}

  async readUserPreference(): Promise<UserPreference> {
    const rawPref = await this.config.database.getMiscData(DB_KEY);

    if (!rawPref) {
      return defaultUserPreference;
    }

    const parsedData = safeJSONParse(rawPref.data);

    if (!parsedData.success) {
      logger.info('parsing failed');

      return defaultUserPreference;
    }

    const validatedData = await userPreferenceSchema.safeParseAsync(
      parsedData.value,
    );

    if (!validatedData.success) {
      logger.info('validation failed');

      return defaultUserPreference;
    }

    return {
      ...defaultUserPreference,
      ...validatedData.data,
    };
  }

  async updatePreference<K extends keyof UserPreference>(
    key: K,
    value: UserPreference[K],
  ): Promise<void> {
    return this.updatePreferences({ [key]: value });
  }

  async updatePreferences(partialPrefs: UserPreferenceOptional): Promise<void> {
    const validated = userPreferenceSchema.safeParse(partialPrefs);

    if (!validated.success) {
      validated.error.toString();
      throwAppError(
        APP_ERROR_NAME.userPreferenceInvalidData,
        'Unable to update user preferences, invalid data',
        {
          stringError: validated.error.toString(),
        },
      );
    }

    const currentPrefs = await this.readUserPreference();

    const updatedPrefs = {
      ...currentPrefs,
      ...partialPrefs,
    };

    // reduce the size of prefs by removing the default values
    for (const [_key, val] of Object.entries(updatedPrefs)) {
      const key = _key as keyof UserPreference;

      if (
        val === undefined ||
        // this will work since preference are only primitive JS values
        val === defaultUserPreference[key]
      ) {
        delete updatedPrefs[key];
      }
    }

    const result = safeJSONStringify(updatedPrefs);

    if (result.success) {
      // Save the updated preferences back to the database
      // Replace this with your actual database update logic
      await this.config.database.setMiscData(DB_KEY, result.value);
      this.config.onChange?.(updatedPrefs);
    }
  }
}
