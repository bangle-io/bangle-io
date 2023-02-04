import { ActionSerializer } from '../action-serializer';
import {
  calcDependencies,
  calcReverseDependencies,
  flattenReverseDependencies,
} from '../common';
import type { AnySliceBase } from '../types';

const actionSerializer = new ActionSerializer(
  {
    key: 'any',
    initState: {},
    dependencies: [],
    selectors: {},
  },
  {},
);

describe('calcReverseDependencies', () => {
  const createAnySliceBase = (key: string, deps: string[]): AnySliceBase => {
    return {
      key: {
        key,
        initState: {},
        dependencies: deps.map((dep) => {
          return createAnySliceBase(dep, []);
        }),
      },
      _actionSerializer: actionSerializer,
      fingerPrint: '',
    };
  };

  describe.each([
    {
      name: '1',
      slices: [createAnySliceBase('sl1', ['sl2', 'sl3'])],
      dep: {
        sl1: new Set(['sl2', 'sl3']),
      },
      reverseDep: {
        sl2: new Set(['sl1']),
        sl3: new Set(['sl1']),
      },
      flatReverseDep: {
        sl1: new Set([]),
        sl2: new Set(['sl1']),
        sl3: new Set(['sl1']),
      },
    },
    {
      name: '2',
      slices: [
        createAnySliceBase('sl0', ['sl1']),
        createAnySliceBase('sl1', ['sl2', 'sl3']),
        createAnySliceBase('sl2', ['sl3']),
        createAnySliceBase('sl3', []),
      ],
      dep: {
        sl0: new Set(['sl1']),
        sl1: new Set(['sl2', 'sl3']),
        sl2: new Set(['sl3']),
        sl3: new Set([]),
      },
      reverseDep: {
        sl1: new Set(['sl0']),
        sl2: new Set(['sl1']),
        sl3: new Set(['sl1', 'sl2']),
      },
      flatReverseDep: {
        sl0: new Set([]),
        sl1: new Set(['sl0']),
        sl2: new Set(['sl0', 'sl1']),
        sl3: new Set(['sl0', 'sl1', 'sl2']),
      },
    },
    {
      name: '3',
      slices: [
        createAnySliceBase('sl0', ['sl1']),
        createAnySliceBase('sl1', ['sl2', 'sl3']),
        createAnySliceBase('sl2', ['sl3']),
        createAnySliceBase('sl3', []),
      ],
      dep: {
        sl0: new Set(['sl1']),
        sl1: new Set(['sl2', 'sl3']),
        sl2: new Set(['sl3']),
        sl3: new Set([]),
      },
      reverseDep: {
        sl1: new Set(['sl0']),
        sl2: new Set(['sl1']),
        sl3: new Set(['sl1', 'sl2']),
      },
      flatReverseDep: {
        sl0: new Set([]),
        sl1: new Set(['sl0']),
        sl2: new Set(['sl0', 'sl1']),
        sl3: new Set(['sl0', 'sl1', 'sl2']),
      },
    },
    {
      name: '4',
      slices: [
        createAnySliceBase('sl0', ['sl1']),
        createAnySliceBase('sl1', ['sl2']),
        createAnySliceBase('sl2', ['sl3']),
        createAnySliceBase('sl3', ['sl4']),
      ],
      dep: {
        sl0: new Set(['sl1']),
        sl1: new Set(['sl2']),
        sl2: new Set(['sl3']),
        sl3: new Set(['sl4']),
      },
      reverseDep: {
        sl1: new Set(['sl0']),
        sl2: new Set(['sl1']),
        sl3: new Set(['sl2']),
        sl4: new Set(['sl3']),
      },
      flatReverseDep: {
        sl0: new Set([]),
        sl1: new Set(['sl0']),
        sl2: new Set(['sl0', 'sl1']),
        sl3: new Set(['sl0', 'sl1', 'sl2']),
        sl4: new Set(['sl0', 'sl1', 'sl2', 'sl3']),
      },
    },

    {
      name: '4',
      slices: [
        createAnySliceBase('sl1', ['sl2', 'sl3']),
        createAnySliceBase('slA', ['sl2', 'sl3']),
        createAnySliceBase('slB', ['slA', 'sl1']),
      ],
      dep: {
        sl1: new Set(['sl2', 'sl3']),
        slA: new Set(['sl2', 'sl3']),
        slB: new Set(['slA', 'sl1']),
      },
      reverseDep: {
        sl1: new Set(['slB']),
        sl2: new Set(['slA', 'sl1']),
        sl3: new Set(['slA', 'sl1']),
        slA: new Set(['slB']),
      },
      flatReverseDep: {
        sl1: new Set(['slB']),
        sl2: new Set(['slA', 'sl1', 'slB']),
        sl3: new Set(['slA', 'sl1', 'slB']),
        slA: new Set(['slB']),
        slB: new Set([]),
      },
    },

    {
      name: '5',
      slices: [
        createAnySliceBase('D', ['A', 'B', 'C']),
        createAnySliceBase('A', ['B']),
        createAnySliceBase('B', []),
        createAnySliceBase('C', ['B']),
      ],
      dep: {
        D: new Set(['A', 'B', 'C']),
        A: new Set(['B']),
        B: new Set([]),
        C: new Set(['B']),
      },
      reverseDep: {
        A: new Set(['D']),
        B: new Set(['A', 'C', 'D']),
        C: new Set(['D']),
      },
      flatReverseDep: {
        A: new Set(['D']),
        B: new Set(['A', 'C', 'D']),
        C: new Set(['D']),
        D: new Set([]),
      },
    },

    {
      name: '5',
      slices: [
        createAnySliceBase('X', ['C', 'A', 'B']),
        createAnySliceBase('C', ['F', 'R']),
        createAnySliceBase('F', ['B']),
        createAnySliceBase('R', ['B']),
        createAnySliceBase('A', []),
        createAnySliceBase('B', []),
      ],
      dep: {
        X: new Set(['C', 'A', 'B']),
        C: new Set(['F', 'R']),
        F: new Set(['B']),
        R: new Set(['B']),
        A: new Set([]),
        B: new Set([]),
      },
      reverseDep: {
        C: new Set(['X']),
        F: new Set(['C']),
        R: new Set(['C']),
        A: new Set(['X']),
        B: new Set(['F', 'R', 'X']),
      },
      flatReverseDep: {
        C: new Set(['X']),
        F: new Set(['C', 'X']),
        R: new Set(['C', 'X']),
        A: new Set(['X']),
        B: new Set(['F', 'R', 'C', 'X']),
        X: new Set([]),
      },
    },

    {
      name: '5',
      slices: [
        createAnySliceBase('E', ['F', 'G', 'H']),
        createAnySliceBase('F', ['B', 'G']),
        createAnySliceBase('G', ['B']),
        createAnySliceBase('H', ['B']),
        createAnySliceBase('I', ['B']),
        createAnySliceBase('B', ['A', 'D']),
        createAnySliceBase('A', ['X']),
        createAnySliceBase('D', ['X']),
        createAnySliceBase('C', ['D', 'X']),
        createAnySliceBase('X', []),
      ],
      dep: {
        E: new Set(['F', 'G', 'H']),
        F: new Set(['B', 'G']),
        G: new Set(['B']),
        H: new Set(['B']),
        I: new Set(['B']),
        B: new Set(['A', 'D']),
        A: new Set(['X']),
        D: new Set(['X']),
        C: new Set(['D', 'X']),
        X: new Set([]),
      },
      reverseDep: {
        F: new Set(['E']),
        G: new Set(['E', 'F']),
        H: new Set(['E']),
        B: new Set(['F', 'G', 'H', 'I']),
        A: new Set(['B']),
        D: new Set(['B', 'C']),
        X: new Set(['A', 'D', 'C']),
      },
      flatReverseDep: {
        F: new Set(['E']),
        G: new Set(['E', 'F']),
        H: new Set(['E']),
        I: new Set([]),
        B: new Set(['E', 'G', 'H', 'I', 'F']),
        A: new Set(['B', 'E', 'G', 'H', 'I', 'F']),
        D: new Set(['B', 'C', 'E', 'G', 'H', 'I', 'F']),
        X: new Set(['A', 'C', 'D', 'B', 'E', 'G', 'H', 'I', 'F']),
        E: new Set([]),
        C: new Set([]),
      },
    },
  ])('dep calcs', ({ name, slices, dep, reverseDep, flatReverseDep }) => {
    test('calcDependencies ' + name, () => {
      expect(calcDependencies(slices)).toEqual(dep);
    });

    test('calcReverseDependencies ' + name, () => {
      expect(calcReverseDependencies(slices)).toEqual(reverseDep);
    });

    test('flattenReverseDependencies ' + name, () => {
      expect(
        flattenReverseDependencies(calcReverseDependencies(slices)),
      ).toEqual(flatReverseDep);
    });
  });

  //   test('works 1', () => {
  //     const sl1 = createAnySliceBase('sl1', ['sl2', 'sl3']);
  //     const sl2 = createAnySliceBase('sl2', []);

  //     expect(calcReverseDependencies([sl1, sl2])).toEqual({
  //       sl2: new Set(['sl1']),
  //       sl3: new Set(['sl1']),
  //     });
  //   });
});
