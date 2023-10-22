import { GetStoreState, expectType, IfEquals } from '../types';
import { Slice, slice } from '../slice';
import { testCleanup } from '../helpers/test-cleanup';
import { InferDepNameFromSlice } from '../types';
import { UpdaterType } from '../helpers';

beforeEach(() => {
  testCleanup();
});

describe('slice', () => {
  describe('types and setup', () => {
    const mySlice = slice([], {
      name: 'mySlice',
      state: {
        a: 1,
      },
    });

    const mySlice2 = slice([mySlice], {
      name: 'mySlice2',
      state: {
        a: 1,
      },
    });

    describe('dependencies', () => {
      it('should have correct types', () => {
        expectType<Slice<'mySlice', { a: number }, never>, typeof mySlice>(
          mySlice,
        );
        type DepName = InferDepNameFromSlice<typeof mySlice>;
        type Match = IfEquals<never, DepName, true, false>;
        let result: Match = true;
      });

      it('should have correct types with dependencies', () => {
        expectType<Slice<'mySlice2', { a: number }, never>, typeof mySlice2>(
          mySlice2,
        );
        type DepName = InferDepNameFromSlice<typeof mySlice2>;
        type Match = IfEquals<'mySlice', DepName, true, false>;
        let result: Match = true as const;

        expectType<
          Slice<'mySlice2', { a: number }, 'mySlice2'>,
          typeof mySlice2
        >(mySlice2);
      });
    });

    test('get', () => {
      // type checks
      () => {
        let storeState: GetStoreState<typeof mySlice> = {} as any;
        let result = mySlice.get(storeState);
        expectType<{ a: number }, typeof result>(result);
      };

      () => {
        let storeState: GetStoreState<typeof mySlice2> = {} as any;
        //   @ts-expect-error should fail as mySlice is not in store
        let result = mySlice.get(storeState);
      };

      () => {
        let storeState: GetStoreState<typeof mySlice2 | typeof mySlice> =
          {} as any;
        let result = mySlice.get(storeState);
      };
    });

    test('update', () => {
      // type checks
      () => {
        let storeState: GetStoreState<typeof mySlice> = {} as any;
        let result = mySlice.update(storeState, {
          a: 2,
        });
        expectType<UpdaterType<'mySlice'>, typeof result>(result);
      };

      () => {
        let storeState: GetStoreState<typeof mySlice2> = {} as any;
        //   @ts-expect-error should fail as mySlice is not in store
        let result = mySlice.update(storeState, { a: 3 });
      };

      () => {
        let storeState: GetStoreState<typeof mySlice> = {} as any;
        let result = mySlice.update(storeState, {
          //   @ts-expect-error invalid type
          a: false,
        });
      };

      () => {
        let storeState: GetStoreState<typeof mySlice> = {} as any;
        let result = mySlice.update(storeState, (sliceState) => {
          expectType<{ a: number }, typeof sliceState>(sliceState);
          return {
            a: 2,
          };
        });
        expectType<UpdaterType<'mySlice'>, typeof result>(result);
      };
    });
  });
});
