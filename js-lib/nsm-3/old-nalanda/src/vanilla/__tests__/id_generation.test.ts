import { idGeneration } from '../helpers/id_generation';
import { testCleanup } from '../helpers/test-cleanup';

beforeEach(() => {
  testCleanup();
});

describe('idGeneration.createActionId', () => {
  it('should generate unique transaction IDs', () => {
    const id1 = idGeneration.createTransactionId();
    const id2 = idGeneration.createTransactionId();
    const id3 = idGeneration.createTransactionId();

    expect(id1).not.toEqual(id2);
    expect(id1).toMatchInlineSnapshot(`"tx_0"`);
    expect(id3).toMatchInlineSnapshot(`"tx_2"`);
  });
});

describe('idGeneration.createActionId', () => {
  it('should generate unique action IDs', () => {
    const mySliceId = idGeneration.createSliceId('mySlice');

    const id1 = idGeneration.createActionId(mySliceId);

    expect(id1).toMatchInlineSnapshot(`"a_[sl_mySlice$]"`);
  });

  it('works with same slice id', () => {
    const mySliceId = idGeneration.createSliceId('mySlice');

    const id1 = idGeneration.createActionId(mySliceId);
    const id2 = idGeneration.createActionId(mySliceId);
    const id3 = idGeneration.createActionId(mySliceId);

    expect(id1).toMatchInlineSnapshot(`"a_[sl_mySlice$]"`);
    expect(id2).toMatchInlineSnapshot(`"a_[sl_mySlice$]0"`);
    expect(id3).toMatchInlineSnapshot(`"a_[sl_mySlice$]1"`);
  });

  it('works duplicated slice id', () => {
    const mySliceId0 = idGeneration.createSliceId('mySlice');
    const mySliceId1 = idGeneration.createSliceId('mySlice');

    const id1 = idGeneration.createActionId(mySliceId1);
    const id2 = idGeneration.createActionId(mySliceId1);
    const id3 = idGeneration.createActionId(mySliceId1);
    const id0 = idGeneration.createActionId(mySliceId0);

    expect(id0).toMatchInlineSnapshot(`"a_[sl_mySlice$]"`);
    expect(id1).toMatchInlineSnapshot(`"a_[sl_mySlice$1]"`);
    expect(id2).toMatchInlineSnapshot(`"a_[sl_mySlice$1]0"`);
    expect(id3).toMatchInlineSnapshot(`"a_[sl_mySlice$1]1"`);
  });

  it('works with hint', () => {
    const mySliceId = idGeneration.createSliceId('mySlice');

    const id1 = idGeneration.createActionId(mySliceId, 'hint');
    const id2 = idGeneration.createActionId(mySliceId, 'hint');

    expect(id1).toMatchInlineSnapshot(`"a_hint[sl_mySlice$]"`);
    expect(id2).toMatchInlineSnapshot(`"a_hint[sl_mySlice$]0"`);
  });
});

describe('idGeneration.createSliceId', () => {
  it('should generate unique slice IDs for different names', () => {
    const id1 = idGeneration.createSliceId('mySlice');
    const id2 = idGeneration.createSliceId('mySlice2');
    const id3 = idGeneration.createSliceId('mySlice3');

    expect(id1).not.toEqual(id2);
    expect(id1).not.toEqual(id3);
    expect(id2).not.toEqual(id3);
    expect(id1).toMatchInlineSnapshot(`"sl_mySlice$"`);
    expect(id2).toMatchInlineSnapshot(`"sl_mySlice2$"`);
    expect(id3).toMatchInlineSnapshot(`"sl_mySlice3$"`);
  });
});
