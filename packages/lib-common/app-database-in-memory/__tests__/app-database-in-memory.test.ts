import { AppDatabaseInMemory } from '../index';

let db: AppDatabaseInMemory;

beforeEach(() => {
  db = new AppDatabaseInMemory();
});

describe('getEntry', () => {
  it('should return the correct entry for a workspace', async () => {
    const testValue = { some: 'data' };
    db.workspaces.set('testKey', testValue);

    const result = await db.getEntry('testKey', {
      tableName: 'workspace-info',
    });
    expect(result).toEqual({ found: true, value: testValue });
  });

  it('should return not found for a non-existent key', async () => {
    const result = await db.getEntry('nonExistentKey', {
      tableName: 'workspace-info',
    });
    expect(result).toEqual({ found: false, value: undefined });
  });
});

describe('updateEntry', () => {
  it('should update an existing workspace entry', async () => {
    const testValue = { some: 'data' };
    db.workspaces.set('testKey', testValue);

    await db.updateEntry('testKey', () => ({ value: { some: 'newData' } }), {
      tableName: 'workspace-info',
    });

    expect(db.workspaces.get('testKey')).toEqual({ some: 'newData' });
  });

  it('should not update if callback returns null', async () => {
    db.miscData.set('testKey', 'testValue');
    await db.updateEntry('testKey', () => null, {
      tableName: 'misc',
    });
    expect(db.miscData.get('testKey')).toEqual('testValue');
  });
});

describe('getAllEntries', () => {
  it('should return all workspace entries', async () => {
    db.workspaces.set('key1', 'value1');
    db.workspaces.set('key2', 'value2');
    const result = await db.getAllEntries({ tableName: 'workspace-info' });
    expect(result).toEqual(['value1', 'value2']);
  });

  it('should return all miscData entries', async () => {
    db.miscData.set('key1', 'value1');
    db.miscData.set('key2', 'value2');
    const result = await db.getAllEntries({
      tableName: 'misc',
    });
    expect(result).toEqual(['value1', 'value2']);
  });
});

describe('deleteEntry', () => {
  it('should delete an existing workspace entry', async () => {
    db.workspaces.set('testKey', 'testValue');
    await db.deleteEntry('testKey', { tableName: 'workspace-info' });
    expect(db.workspaces.has('testKey')).toBeFalsy();
  });
});
