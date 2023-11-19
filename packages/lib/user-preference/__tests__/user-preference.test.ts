import { AppDatabase } from '@bangle.io/app-database';
import { AppDatabaseInMemory } from '@bangle.io/app-database-in-memory';
import { COLOR_SCHEME } from '@bangle.io/constants';

import { PREFER_SYSTEM_COLOR_SCHEME } from '../constants';
import { DB_KEY, defaultUserPreference, UserPreferenceManager } from '../index';
import { logger } from '../logger';

beforeEach(() => {
  logger.silence();
  jest.spyOn(logger, 'info').mockImplementation(() => {});
  jest.spyOn(logger, 'error').mockImplementation(() => {});
});

describe('UserPreferenceManager', () => {
  // Setup function
  const setup = ({
    database,
    onChange,
  }: { database?: AppDatabase; onChange?: (change: any) => void } = {}) => {
    const mockDatabase =
      database ??
      new AppDatabase({
        database: new AppDatabaseInMemory(),
        onChange: () => {},
      });

    const mockOnChange = onChange ?? jest.fn();

    const userPreferenceManager = new UserPreferenceManager({
      database: mockDatabase,
      onChange: mockOnChange,
    });

    return {
      userPreferenceManager,
      mockDatabase,
      mockOnChange,
    };
  };

  describe('readUserPreference', () => {
    it('should return default preferences if none are stored', async () => {
      const { userPreferenceManager } = setup();

      const prefs = await userPreferenceManager.readUserPreference();

      expect(prefs).toEqual({
        themePreference: PREFER_SYSTEM_COLOR_SCHEME,
        version: 1,
      });
    });

    it('should return stored preferences', async () => {
      let database: AppDatabase;
      const storedPrefs = { themePreference: COLOR_SCHEME.DARK, version: 2 };

      async function fillDatabase() {
        const { userPreferenceManager, mockDatabase } = setup();
        database = mockDatabase;
        await userPreferenceManager.updatePreferences(storedPrefs);
      }

      await fillDatabase();

      const { userPreferenceManager } = setup({ database: database! });

      const prefs = await userPreferenceManager.readUserPreference();

      expect(prefs).toEqual(storedPrefs);
    });

    it('should return default preferences on parsing failure', async () => {
      const { userPreferenceManager, mockDatabase } = setup();
      await mockDatabase.setMiscData(DB_KEY, 'invalid JSON');
      const prefs = await userPreferenceManager.readUserPreference();

      expect(prefs).toEqual({
        themePreference: PREFER_SYSTEM_COLOR_SCHEME,
        version: 1,
      });

      expect(logger.info).toHaveBeenCalledWith('parsing failed');
    });

    it('should return default preferences on validation failure', async () => {
      const { userPreferenceManager, mockDatabase } = setup();

      const invalidPrefs = { themePreference: 'invalid-theme', version: 2 };
      await mockDatabase.setMiscData(DB_KEY, JSON.stringify(invalidPrefs));

      const prefs = await userPreferenceManager.readUserPreference();

      expect(prefs).toEqual({
        themePreference: PREFER_SYSTEM_COLOR_SCHEME,
        version: 1,
      });

      expect(logger.info).toHaveBeenCalledWith('validation failed');
    });
  });

  describe('updatePreferences', () => {
    it('should remove default values when updating preferences', async () => {
      const { userPreferenceManager, mockDatabase } = setup();
      const newPrefs = {
        themePreference: PREFER_SYSTEM_COLOR_SCHEME,
        version: 1,
      } as const;

      await userPreferenceManager.updatePreferences(newPrefs);

      expect((await mockDatabase.getMiscData(DB_KEY))?.data).toEqual(
        JSON.stringify({}),
      );
    });

    it('should call onChange with updated preferences', async () => {
      const { userPreferenceManager, mockOnChange } = setup();
      const partialUpdate = { themePreference: COLOR_SCHEME.DARK };

      await userPreferenceManager.updatePreferences(partialUpdate);

      expect(mockOnChange).toHaveBeenCalledWith({
        ...partialUpdate,
      });
    });

    it('should update a single preference correctly', async () => {
      const { userPreferenceManager, mockDatabase } = setup();
      const key = 'themePreference';
      const value = COLOR_SCHEME.DARK;

      await userPreferenceManager.updatePreference(key, value);

      expect((await mockDatabase.getMiscData(DB_KEY))?.data).toEqual(
        JSON.stringify({ [key]: value }),
      );
    });

    it('should call onChange with updated single preference', async () => {
      const { userPreferenceManager, mockOnChange } = setup();
      const key = 'themePreference';
      const value = COLOR_SCHEME.DARK;

      await userPreferenceManager.updatePreference(key, value);

      expect(mockOnChange).toHaveBeenCalledWith({
        [key]: value,
      });
    });

    it('should not update with default value', async () => {
      const { userPreferenceManager, mockDatabase } = setup();
      const key = 'themePreference';
      const value = PREFER_SYSTEM_COLOR_SCHEME;

      await userPreferenceManager.updatePreference(key, value);

      expect((await mockDatabase.getMiscData(DB_KEY))?.data).toEqual(
        JSON.stringify({}),
      );
    });

    it('should handle partially valid preferences', async () => {
      const { userPreferenceManager, mockDatabase } = setup();
      const partialValidPrefs = {
        themePreference: COLOR_SCHEME.DARK,
        invalidField: 'invalid',
      };
      await mockDatabase.setMiscData(DB_KEY, JSON.stringify(partialValidPrefs));

      const prefs = await userPreferenceManager.readUserPreference();
      expect(prefs).toEqual({
        ...defaultUserPreference,
        themePreference: COLOR_SCHEME.DARK,
      });
    });

    it('should throw an error with invalid data', async () => {
      const { userPreferenceManager, mockOnChange } = setup();

      await expect(
        userPreferenceManager.updatePreferences({
          // @ts-expect-error - invalid theme
          themePreference: 'invalid-theme',
        }),
      ).rejects.toThrow('Unable to update user preferences, invalid data');

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should correctly update partial preferences', async () => {
      const { userPreferenceManager, mockDatabase } = setup();
      const partialUpdate = { themePreference: COLOR_SCHEME.DARK };

      await userPreferenceManager.updatePreferences(partialUpdate);

      const updatedPrefs = JSON.parse(
        (await mockDatabase.getMiscData(DB_KEY))?.data!,
      );
      expect(updatedPrefs).toEqual(partialUpdate);
    });

    it('should handle empty object updates', async () => {
      const { userPreferenceManager, mockDatabase } = setup();

      await userPreferenceManager.updatePreferences({});

      expect((await mockDatabase.getMiscData(DB_KEY))?.data).toEqual(
        JSON.stringify({}),
      );
    });
  });
});
