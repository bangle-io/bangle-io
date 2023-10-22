/* eslint-disable @typescript-eslint/no-duplicate-type-constituents */
import { DoesExtendBool, expectType } from '../types';

describe('does extend', () => {
  test('works', () => {
    expectType<DoesExtendBool<'kushan', 'kushan' | 'joshi' | 'test'>, true>(
      true,
    );
    expectType<DoesExtendBool<'kushan', 'kushan' | 'joshi'>, true>(true);
    expectType<DoesExtendBool<'kushan', 'kushan'>, true>(true);

    expectType<DoesExtendBool<'kushan', ''>, false>(false);
    expectType<
      DoesExtendBool<'kushan' | 'joshi', 'kushan' | 'c' | 'joshi' | 'c'>,
      true
    >(true);

    expectType<
      DoesExtendBool<'kushan' | 'joshi' | 'k', 'kushan' | 'c' | 'joshi' | 'c'>,
      false
    >(false);

    expectType<
      DoesExtendBool<
        'kushan' | 'joshi' | 'k',
        'kushan' | 'c' | 'joshi' | 'c' | 'k'
      >,
      true
    >(true);
  });
});
