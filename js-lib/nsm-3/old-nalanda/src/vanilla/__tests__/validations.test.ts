import { AnySlice } from '../types';
import {
  validateSlices,
  checkUniqueSliceId,
  findDuplications,
  circularCheck,
} from '../helpers/validations';

const createSlice = ({ sliceId, dependencies }: any): AnySlice => {
  return {
    sliceId,
    dependencies,
  } as AnySlice;
};
describe('Slice validation', () => {
  test('validates slices with unique dependencies', () => {
    const slice1 = createSlice({ sliceId: '1', dependencies: [] });
    const slice2 = createSlice({ sliceId: '2', dependencies: [slice1] });
    const slice3 = createSlice({
      sliceId: '3',
      dependencies: [slice1, slice2],
    });

    expect(() => validateSlices([slice1, slice2, slice3])).not.toThrow();
  });

  test('throws an error when a slice has duplicate dependencies', () => {
    const slice1 = createSlice({ sliceId: '1', dependencies: [] });
    const slice2 = createSlice({
      sliceId: '2',
      dependencies: [slice1, slice1],
    });

    expect(() => validateSlices([slice1, slice2])).toThrow(
      /duplicate dependencies/,
    );
  });

  test('throws an error when there are duplicate slice ids', () => {
    const slice1 = createSlice({ sliceId: '1', dependencies: [] });
    const slice2 = createSlice({ sliceId: '1', dependencies: [] });

    expect(() => validateSlices([slice1, slice2])).toThrow(
      /Duplicate slice ids/,
    );
  });

  test('finds duplicate slice ids', () => {
    expect(findDuplications(['1', '2', '1'])).toEqual(['1']);
  });

  test('throws an error when slices have circular dependencies', () => {
    const slice1 = createSlice({ sliceId: '1', dependencies: [] });
    const slice2 = createSlice({ sliceId: '2', dependencies: [slice1] });
    slice1.dependencies.push(slice2);

    expect(() => circularCheck([slice1, slice2])).toThrow(
      /Circular dependency detected/,
    );
  });

  test('cyclic dep 2', () => {
    const sl0 = createSlice({ sliceId: 'sl0', dependencies: [] });
    const sl1 = createSlice({ sliceId: 'sl1', dependencies: [] });
    const sl2 = createSlice({ sliceId: 'sl2', dependencies: [] });
    const sl3 = createSlice({ sliceId: 'sl3', dependencies: [] });
    const sl4 = createSlice({ sliceId: 'sl4', dependencies: [] });

    sl0.dependencies.push(sl1, sl2);
    sl1.dependencies.push(sl3);
    sl2.dependencies.push(sl3);
    sl3.dependencies.push(sl4);
    sl4.dependencies.push(sl0, sl2);

    expect(() => circularCheck([sl0, sl1, sl2, sl3, sl4])).toThrowError(
      `Circular dependency detected in slice "sl0" with path sl0 ->sl1 ->sl3 ->sl4 ->sl0`,
    );
  });

  test('throws an error when a slice has a dependency that is registered after it', () => {
    const slice1 = createSlice({ sliceId: '1', dependencies: [] });
    const slice2 = createSlice({ sliceId: '2', dependencies: [slice1] });

    expect(() => validateSlices([slice2, slice1])).toThrow(
      /either not registered or is registered after this slice/,
    );
  });
});
