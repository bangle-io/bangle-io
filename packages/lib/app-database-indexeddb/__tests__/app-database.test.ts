import { AppDatabaseIndexedDB } from '../index';

describe('AppDatabaseIndexedDB', () => {
  let database: AppDatabaseIndexedDB;

  beforeEach(() => {
    database = new AppDatabaseIndexedDB();
  });

  describe('getEntry', () => {
    it('should find an existing entry', async () => {
      await database.updateEntry('testKey', () => ({ value: 'testValue' }), {
        isWorkspaceInfo: true,
      });

      const result = await database.getEntry('testKey', {
        isWorkspaceInfo: true,
      });

      expect(result.found).toBeTruthy();
      expect(result.value).toEqual('testValue');
    });

    it('should not find a non-existing entry', async () => {
      const result = await database.getEntry('nonExistingKey', {
        isWorkspaceInfo: true,
      });
      expect(result.found).toBeFalsy();
    });
  });

  describe('getAllEntries', () => {
    it('should return an empty array for no entries', async () => {
      const entries = await database.getAllEntries({ isWorkspaceInfo: true });
      expect(entries).toEqual([]);
    });

    it('should return all entries', async () => {
      await database.updateEntry('testKey1', () => ({ value: 'testValue1' }), {
        isWorkspaceInfo: true,
      });
      await database.updateEntry('testKey2', () => ({ value: 'testValue2' }), {
        isWorkspaceInfo: false,
      });

      const workspaceEntries = await database.getAllEntries({
        isWorkspaceInfo: true,
      });
      const miscEntries = await database.getAllEntries({
        isWorkspaceInfo: false,
      });

      expect(workspaceEntries).toEqual(['testValue1']);
      expect(miscEntries).toEqual(['testValue2']);
    });
  });

  describe('updateEntry', () => {
    it('should update an existing entry', async () => {
      await database.updateEntry(
        'existingKey',
        () => ({ value: 'initialValue' }),
        { isWorkspaceInfo: true },
      );
      await database.updateEntry(
        'existingKey',
        () => ({ value: 'updatedValue' }),
        { isWorkspaceInfo: true },
      );

      const result = await database.getEntry('existingKey', {
        isWorkspaceInfo: true,
      });
      expect(result.value).toEqual('updatedValue');
    });

    it('should create a new entry if not existing', async () => {
      await database.updateEntry('newKey', () => ({ value: 'newValue' }), {
        isWorkspaceInfo: true,
      });

      const result = await database.getEntry('newKey', {
        isWorkspaceInfo: true,
      });
      expect(result.found).toBeTruthy();
      expect(result.value).toEqual('newValue');
    });
  });

  describe('updateEntry Method Tests', () => {
    const testKey = 'testKey';
    const initialValue = 'initialValue';
    const updatedValue = 'updatedValue';

    it('should provide existing value to update callback if entry exists', async () => {
      expect.assertions(2);
      await database.updateEntry(testKey, () => ({ value: initialValue }), {
        isWorkspaceInfo: true,
      });

      await database.updateEntry(
        testKey,
        (existing) => {
          expect(existing.value).toEqual(initialValue);
          return { value: updatedValue };
        },
        { isWorkspaceInfo: true },
      );

      const result = await database.getEntry(testKey, {
        isWorkspaceInfo: true,
      });
      expect(result.value).toEqual(updatedValue);
    });

    it('should provide correct parameters to callback when entry is not found', async () => {
      expect.assertions(2);

      await database.updateEntry(
        'nonExistingKey',
        (existing) => {
          expect(existing.found).toBe(false);
          return { value: 'newValue' };
        },
        { isWorkspaceInfo: true },
      );

      const result = await database.getEntry('nonExistingKey', {
        isWorkspaceInfo: true,
      });
      expect(result.value).toEqual('newValue');
    });

    it('should not update entry if callback returns null', async () => {
      await database.updateEntry(testKey, () => ({ value: initialValue }), {
        isWorkspaceInfo: true,
      });
      await database.updateEntry(
        testKey,
        () => {
          return null;
        },
        {
          isWorkspaceInfo: true,
        },
      );

      const result = await database.getEntry(testKey, {
        isWorkspaceInfo: true,
      });
      expect(result.value).toEqual(initialValue);
    });
  });

  describe('deleteEntry', () => {
    it('should delete an existing entry', async () => {
      await database.updateEntry(
        'deleteKey',
        () => ({ value: 'valueToDelete' }),
        { isWorkspaceInfo: true },
      );
      await database.deleteEntry('deleteKey', { isWorkspaceInfo: true });

      const result = await database.getEntry('deleteKey', {
        isWorkspaceInfo: true,
      });
      expect(result.found).toBeFalsy();
    });

    it('should handle deletion of a non-existing entry gracefully', async () => {
      await expect(
        database.deleteEntry('nonExistingDeleteKey', { isWorkspaceInfo: true }),
      ).resolves.not.toThrow();
    });
  });

  it('should use different tables based on isWorkspaceInfo flag', async () => {
    const testKey = 'testKey';
    const workspaceValue = 'workspaceValue';
    const miscValue = 'miscValue';

    await database.updateEntry(testKey, () => ({ value: workspaceValue }), {
      isWorkspaceInfo: true,
    });
    await database.updateEntry(testKey, () => ({ value: miscValue }), {
      isWorkspaceInfo: false,
    });

    // Retrieve entries from both tables
    const workspaceResult = await database.getEntry(testKey, {
      isWorkspaceInfo: true,
    });
    const miscResult = await database.getEntry(testKey, {
      isWorkspaceInfo: false,
    });

    expect(workspaceResult.value).toEqual(workspaceValue);
    expect(miscResult.value).toEqual(miscValue);
  });

  it('should not overwrite entries across different tables', async () => {
    const testKey = 'sharedKey';
    const initialValue = 'initialValue';
    const updatedValue = 'updatedValue';

    // Initially set the same key in both tables
    await database.updateEntry(testKey, () => ({ value: initialValue }), {
      isWorkspaceInfo: true,
    });
    await database.updateEntry(testKey, () => ({ value: initialValue }), {
      isWorkspaceInfo: false,
    });

    // Update only in the workspace table
    await database.updateEntry(testKey, () => ({ value: updatedValue }), {
      isWorkspaceInfo: true,
    });

    // Retrieve entries from both tables
    const workspaceResult = await database.getEntry(testKey, {
      isWorkspaceInfo: true,
    });
    const miscResult = await database.getEntry(testKey, {
      isWorkspaceInfo: false,
    });

    // Verify that only the workspace table entry was updated
    expect(workspaceResult.value).toEqual(updatedValue);
    expect(miscResult.value).toEqual(initialValue);
  });

  describe('Table Isolation Tests for Read and Delete Operations', () => {
    const testKey = 'testKey';
    const workspaceValue = 'workspaceValue';
    const miscValue = 'miscValue';

    beforeEach(async () => {
      // Set up entries in both tables
      await database.updateEntry(testKey, () => ({ value: workspaceValue }), {
        isWorkspaceInfo: true,
      });
      await database.updateEntry(testKey, () => ({ value: miscValue }), {
        isWorkspaceInfo: false,
      });
    });

    it('should read from the correct table based on isWorkspaceInfo flag', async () => {
      // Retrieve entries from both tables
      const workspaceResult = await database.getEntry(testKey, {
        isWorkspaceInfo: true,
      });
      const miscResult = await database.getEntry(testKey, {
        isWorkspaceInfo: false,
      });

      // Verify that the values are read from separate tables
      expect(workspaceResult.value).toEqual(workspaceValue);
      expect(miscResult.value).toEqual(miscValue);
    });

    it('should delete from the correct table without affecting the other', async () => {
      // Delete entry from the workspace table
      await database.deleteEntry(testKey, { isWorkspaceInfo: true });

      // Try retrieving the deleted entry from the workspace table
      const deletedWorkspaceResult = await database.getEntry(testKey, {
        isWorkspaceInfo: true,
      });

      // Try retrieving the same key from the misc table
      const existingMiscResult = await database.getEntry(testKey, {
        isWorkspaceInfo: false,
      });

      // Verify that the entry was deleted only from the workspace table
      expect(deletedWorkspaceResult.found).toBeFalsy();
      expect(existingMiscResult.value).toEqual(miscValue);
    });
  });
});
