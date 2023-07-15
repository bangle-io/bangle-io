import { z } from 'zod';
import { zodFindUnsafeTypes } from '../zod-helpers';
describe('zodFindUnsafeTypes', () => {
  test('catches functions', () => {
    const schema = z.object({
      a: z.function().optional(),
    });

    expect(zodFindUnsafeTypes(schema)).toEqual(['ZodFunction']);

    expect(
      zodFindUnsafeTypes(
        z.object({
          a: z.function().nullable(),
        }),
      ),
    ).toEqual(['ZodFunction']);

    expect(
      zodFindUnsafeTypes(
        z.object({
          foo: z.object({
            foo: z.object({
              a: z.function().nullable(),
            }),
          }),
        }),
      ),
    ).toEqual(['ZodFunction']);
  });

  test('works', () => {
    expect(
      zodFindUnsafeTypes(
        z.object({
          a: z.record(z.number()),
        }),
      ),
    ).toEqual([]);

    expect(
      zodFindUnsafeTypes(
        z.object({
          a: z.record(z.number()),
        }),
      ),
    ).toEqual([]);
  });

  test('works with nativeEnum 1', () => {
    enum Fruits {
      Apple,
      Banana,
    }
    const FruitEnum = z.nativeEnum(Fruits);
    expect(zodFindUnsafeTypes(FruitEnum)).toEqual([]);
  });

  test('nativeEnum: throws error works with boolean', () => {
    const MyObj = {
      Apple: 'apple',
      Banana: false,
    } as const;

    // @ts-expect-error
    expect(zodFindUnsafeTypes(z.nativeEnum(MyObj))).toEqual([
      'ZodNativeEnum: for Banana only supports string, number and boolean',
    ]);
  });
});
