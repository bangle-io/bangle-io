import { AppDatabaseIndexedDB } from '../index';

describe('AppDatabaseIndexedDB', () => {
  let database: AppDatabaseIndexedDB;

  beforeEach(() => {
    database = new AppDatabaseIndexedDB();
  });

  describe('getEntry', () => {
    it('should find an existing entry', async () => {
      await database.updateEntry('testKey', () => ({ value: 'testValue' }), {
        tableName: 'workspace-info',
      });

      const result = await database.getEntry('testKey', {
        tableName: 'workspace-info',
      });

      expect(result.found).toBeTruthy();
      expect(result.value).toEqual('testValue');
    });

    it('should not find a non-existing entry', async () => {
      const result = await database.getEntry('nonExistingKey', {
        tableName: 'workspace-info',
      });
      expect(result.found).toBeFalsy();
    });
  });

  describe('getAllEntries', () => {
    it('should return an empty array for no entries', async () => {
      const entries = await database.getAllEntries({
        tableName: 'workspace-info',
      });
      expect(entries).toEqual([]);
    });

    it('should return all entries', async () => {
      await database.updateEntry('testKey1', () => ({ value: 'testValue1' }), {
        tableName: 'workspace-info',
      });
      await database.updateEntry('testKey2', () => ({ value: 'testValue2' }), {
        tableName: 'misc',
      });

      const workspaceEntries = await database.getAllEntries({
        tableName: 'workspace-info',
      });
      const miscEntries = await database.getAllEntries({
        tableName: 'misc',
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
        { tableName: 'workspace-info' },
      );
      await database.updateEntry(
        'existingKey',
        () => ({ value: 'updatedValue' }),
        { tableName: 'workspace-info' },
      );

      const result = await database.getEntry('existingKey', {
        tableName: 'workspace-info',
      });
      expect(result.value).toEqual('updatedValue');
    });

    it('should create a new entry if not existing', async () => {
      await database.updateEntry('newKey', () => ({ value: 'newValue' }), {
        tableName: 'workspace-info',
      });

      const result = await database.getEntry('newKey', {
        tableName: 'workspace-info',
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
        tableName: 'workspace-info',
      });

      await database.updateEntry(
        testKey,
        (existing) => {
          expect(existing.value).toEqual(initialValue);
          return { value: updatedValue };
        },
        { tableName: 'workspace-info' },
      );

      const result = await database.getEntry(testKey, {
        tableName: 'workspace-info',
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
        { tableName: 'workspace-info' },
      );

      const result = await database.getEntry('nonExistingKey', {
        tableName: 'workspace-info',
      });
      expect(result.value).toEqual('newValue');
    });

    it('should not update entry if callback returns null', async () => {
      await database.updateEntry(testKey, () => ({ value: initialValue }), {
        tableName: 'workspace-info',
      });
      await database.updateEntry(
        testKey,
        () => {
          return null;
        },
        {
          tableName: 'workspace-info',
        },
      );

      const result = await database.getEntry(testKey, {
        tableName: 'workspace-info',
      });
      expect(result.value).toEqual(initialValue);
    });
  });

  describe('deleteEntry', () => {
    it('should delete an existing entry', async () => {
      await database.updateEntry(
        'deleteKey',
        () => ({ value: 'valueToDelete' }),
        { tableName: 'workspace-info' },
      );
      await database.deleteEntry('deleteKey', { tableName: 'workspace-info' });

      const result = await database.getEntry('deleteKey', {
        tableName: 'workspace-info',
      });
      expect(result.found).toBeFalsy();
    });

    it('should handle deletion of a non-existing entry gracefully', async () => {
      await expect(
        database.deleteEntry('nonExistingDeleteKey', {
          tableName: 'workspace-info',
        }),
      ).resolves.not.toThrow();
    });
  });

  it('should use different tables based on isWorkspaceInfo flag', async () => {
    const testKey = 'testKey';
    const workspaceValue = 'workspaceValue';
    const miscValue = 'miscValue';

    await database.updateEntry(testKey, () => ({ value: workspaceValue }), {
      tableName: 'workspace-info',
    });
    await database.updateEntry(testKey, () => ({ value: miscValue }), {
      tableName: 'misc',
    });

    // Retrieve entries from both tables
    const workspaceResult = await database.getEntry(testKey, {
      tableName: 'workspace-info',
    });
    const miscResult = await database.getEntry(testKey, {
      tableName: 'misc',
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
      tableName: 'workspace-info',
    });
    await database.updateEntry(testKey, () => ({ value: initialValue }), {
      tableName: 'misc',
    });

    // Update only in the workspace table
    await database.updateEntry(testKey, () => ({ value: updatedValue }), {
      tableName: 'workspace-info',
    });

    // Retrieve entries from both tables
    const workspaceResult = await database.getEntry(testKey, {
      tableName: 'workspace-info',
    });
    const miscResult = await database.getEntry(testKey, {
      tableName: 'misc',
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
        tableName: 'workspace-info',
      });
      await database.updateEntry(testKey, () => ({ value: miscValue }), {
        tableName: 'misc',
      });
    });

    it('should read from the correct table based on isWorkspaceInfo flag', async () => {
      // Retrieve entries from both tables
      const workspaceResult = await database.getEntry(testKey, {
        tableName: 'workspace-info',
      });
      const miscResult = await database.getEntry(testKey, {
        tableName: 'misc',
      });

      // Verify that the values are read from separate tables
      expect(workspaceResult.value).toEqual(workspaceValue);
      expect(miscResult.value).toEqual(miscValue);
    });

    it('should delete from the correct table without affecting the other', async () => {
      // Delete entry from the workspace table
      await database.deleteEntry(testKey, { tableName: 'workspace-info' });

      // Try retrieving the deleted entry from the workspace table
      const deletedWorkspaceResult = await database.getEntry(testKey, {
        tableName: 'workspace-info',
      });

      // Try retrieving the same key from the misc table
      const existingMiscResult = await database.getEntry(testKey, {
        tableName: 'misc',
      });

      // Verify that the entry was deleted only from the workspace table
      expect(deletedWorkspaceResult.found).toBeFalsy();
      expect(existingMiscResult.value).toEqual(miscValue);
    });
  });
});
