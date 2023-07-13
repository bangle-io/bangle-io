import { calcReverseDependencies as _calcReverseDependencies } from '../helpers';
import { AnySlice } from '../types';

const createSlice = (id: string) =>
  ({ sliceId: id, dependencies: [] } as unknown as AnySlice);

const setDeps = (slice: AnySlice, deps: string[]) => {
  return {
    ...slice,
    dependencies: deps.map((dep) => createSlice(dep)),
  } as AnySlice;
};

const calcReverseDependencies = (slices: AnySlice[]) => {
  return _calcReverseDependencies(slices) as Record<string, Set<string>>;
};

const sl0 = createSlice('0');
const sl1 = createSlice('1');
const sl2 = createSlice('2');
const sl3 = createSlice('3');
const sl4 = createSlice('4');
const sl5 = createSlice('5');
const sl6 = createSlice('6');
const sl7 = createSlice('7');

const slA = createSlice('A');
const slB = createSlice('B');
const slC = createSlice('C');
const slD = createSlice('D');
const slE = createSlice('E');
const slF = createSlice('F');
const slG = createSlice('G');
const slH = createSlice('H');
const slI = createSlice('I');
const slR = createSlice('R');
const slX = createSlice('X');
const slY = createSlice('Y');

describe('calcReverseDependencies', () => {
  it('should calculate reverse dependencies for case 1', () => {
    const slices = [setDeps(sl1, ['2', '3'])];
    const result = calcReverseDependencies(slices);
    expect(result['2']).toEqual(new Set(['1']));
    expect(result['3']).toEqual(new Set(['1']));
  });

  it('should calculate reverse dependencies for case 2', () => {
    const slices = [
      setDeps(sl0, ['1']),
      setDeps(sl1, ['2', '3']),
      setDeps(sl2, ['3']),
      setDeps(sl3, []),
    ];
    const result = calcReverseDependencies(slices);
    expect(result['1']).toEqual(new Set(['0']));
    expect(result['2']).toEqual(new Set(['0', '1']));
    expect(result['3']).toEqual(new Set(['0', '1', '2']));
  });

  it('should calculate reverse dependencies for case 3', () => {
    const slices = [
      setDeps(sl0, ['1']),
      setDeps(sl1, ['2', '3']),
      setDeps(sl2, ['3']),
      setDeps(sl3, []),
    ];
    const result = calcReverseDependencies(slices);
    expect(result['1']).toEqual(new Set(['0']));
    expect(result['2']).toEqual(new Set(['0', '1']));
    expect(result['3']).toEqual(new Set(['0', '1', '2']));
  });

  it('should calculate reverse dependencies for case 4.a', () => {
    const slices = [
      setDeps(sl0, ['1']),
      setDeps(sl1, ['2']),
      setDeps(sl2, ['3']),
      setDeps(sl3, ['4']),
    ];
    const result = calcReverseDependencies(slices);
    expect(result['1']).toEqual(new Set(['0']));
    expect(result['2']).toEqual(new Set(['0', '1']));
    expect(result['3']).toEqual(new Set(['1', '0', '2']));
    expect(result['4']).toEqual(new Set(['1', '0', '2', '3']));
  });

  it('should calculate reverse dependencies for case 4.b', () => {
    const slices = [
      setDeps(sl1, ['2', '3']),
      setDeps(slA, ['2', '3']),
      setDeps(slB, ['A', '1']),
    ];
    const result = calcReverseDependencies(slices);
    expect(result['2']).toEqual(new Set(['1', 'A', 'B']));
    expect(result['3']).toEqual(new Set(['1', 'A', 'B']));
    expect(result['A']).toEqual(new Set(['B']));
    expect(result['1']).toEqual(new Set(['B']));
    expect(result['B']).toEqual(new Set([]));
  });

  it('should calculate reverse dependencies for case 5', () => {
    const slices = [
      setDeps(slD, ['A', 'B', 'C']),
      setDeps(slA, ['B']),
      setDeps(slB, []),
      setDeps(slC, ['B']),
    ];
    const result = calcReverseDependencies(slices);
    expect(result['A']).toEqual(new Set(['D']));
    expect(result['B']).toEqual(new Set(['D', 'A', 'C']));
    expect(result['C']).toEqual(new Set(['D']));
  });

  it('should calculate reverse dependencies for case 6', () => {
    const slices = [
      setDeps(slX, ['C', 'A', 'B']),
      setDeps(slC, ['F', 'R']),
      setDeps(slF, ['B']),
      setDeps(slR, ['B']),
      setDeps(slA, []),
      setDeps(slB, []),
    ];
    const result = calcReverseDependencies(slices);
    expect(result['A']).toEqual(new Set(['X']));
    expect(result['B']).toEqual(new Set(['C', 'X', 'F', 'R']));
    expect(result['C']).toEqual(new Set(['X']));
    expect(result['F']).toEqual(new Set(['C', 'X']));
    expect(result['R']).toEqual(new Set(['C', 'X']));
    expect(result['X']).toEqual(new Set([]));
  });

  it('should calculate reverse dependencies for case 7', () => {
    const slices = [
      setDeps(slE, ['F', 'G', 'H']),
      setDeps(slF, ['B', 'G']),
      setDeps(slG, ['B']),
      setDeps(slH, ['B']),
      setDeps(slI, ['B']),
      setDeps(slB, ['A', 'D']),
      setDeps(slA, ['X']),
      setDeps(slD, ['X']),
      setDeps(slC, ['D', 'X']),
      setDeps(slX, []),
    ];
    const result = calcReverseDependencies(slices);
    expect(result).toMatchInlineSnapshot(`
      {
        "A": Set {
          "B",
          "F",
          "E",
          "G",
          "H",
          "I",
        },
        "B": Set {
          "F",
          "E",
          "G",
          "H",
          "I",
        },
        "C": Set {},
        "D": Set {
          "B",
          "F",
          "E",
          "G",
          "H",
          "I",
          "C",
        },
        "E": Set {},
        "F": Set {
          "E",
        },
        "G": Set {
          "E",
          "F",
        },
        "H": Set {
          "E",
        },
        "I": Set {},
        "X": Set {
          "A",
          "B",
          "F",
          "E",
          "G",
          "H",
          "I",
          "D",
          "C",
        },
      }
    `);
  });
});
