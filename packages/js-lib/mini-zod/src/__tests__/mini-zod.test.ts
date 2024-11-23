// index.test.ts

import { expectType } from '@bangle.io/mini-js-utils';
import { type InferType, T } from '../index';

describe('Validators', () => {
  test('StringValidator should validate strings', () => {
    expect(T.String.validate('hello')).toBe(true);
    expect(T.String.validate(123)).toBe(false);
    const result: InferType<typeof T.String> = 'hello';
  });

  test('NumberValidator should validate numbers', () => {
    expect(T.Number.validate(123)).toBe(true);
    expect(T.Number.validate('hello')).toBe(false);
    expectType<number, InferType<typeof T.Number>>(3);
  });

  test('BooleanValidator should validate booleans', () => {
    expect(T.Boolean.validate(true)).toBe(true);
    expect(T.Boolean.validate(false)).toBe(true);
    expect(T.Boolean.validate('true')).toBe(false);
    expectType<boolean, InferType<typeof T.Boolean>>(true);
  });

  test('UndefinedValidator should validate undefined', () => {
    expect(T.Undefined.validate(undefined)).toBe(true);
    expect(T.Undefined.validate(null)).toBe(false);
    expectType<undefined, InferType<typeof T.Undefined>>(undefined);
  });

  test('NullValidator should validate null', () => {
    expect(T.Null.validate(null)).toBe(true);
    expect(T.Null.validate(undefined)).toBe(false);
    expectType<null, InferType<typeof T.Null>>(null);
  });

  test('ArrayValidator should validate arrays of elements', () => {
    const stringArrayValidator = T.Array(T.String);
    expect(stringArrayValidator.validate(['a', 'b', 'c'])).toBe(true);
    expect(stringArrayValidator.validate(['a', 2, 'c'])).toBe(false);
    expect(stringArrayValidator.validate('not an array')).toBe(false);

    const numberArrayValidator = T.Array(T.Number);
    const result: InferType<typeof numberArrayValidator> = [1, 4, 3];
    // @ts-expect-error
    const result2: InferType<typeof numberArrayValidator> = [1, '4', 3];

    expectType<string[], InferType<typeof stringArrayValidator>>(null as any);
  });

  test('ObjectValidator should validate objects with given shape', () => {
    const personValidator = T.Object({
      name: T.String,
      age: T.Number,
    });
    expect(personValidator.validate({ name: 'Alice', age: 30 })).toBe(true);
    expect(personValidator.validate({ name: 'Bob', age: 'thirty' })).toBe(
      false,
    );
    expect(personValidator.validate({ name: 'Charlie' })).toBe(false);
    expectType<
      { name: string; age: number },
      InferType<typeof personValidator>
    >(null as any);

    const nestedObjectValidator = T.Object({
      person: personValidator,
      friends: T.Array(personValidator),
    });

    const result: InferType<typeof nestedObjectValidator> = {
      person: { name: 'Alice', age: 30 },
      friends: [
        { name: 'Bob', age: 31 },
        { name: 'Charlie', age: 32 },
      ],
    };

    const result2: InferType<typeof nestedObjectValidator> = {
      person: { name: 'Alice', age: 30 },
      friends: [
        { name: 'Bob', age: 31 },
        {
          name: 'Charlie',
          // @ts-expect-error should be number
          age: 'thirty-two',
        },
      ],
    };
  });

  describe('ObjectValidator', () => {
    const personValidator = T.Object({
      name: T.String,
      age: T.Number,
    });
    const employeeValidator = T.Object({
      id: T.Number,
      person: personValidator,
    });
    const peopleValidator = T.Array(personValidator);
    const optionalValidator = T.Object({
      name: T.String,
      age: T.Optional(T.Number),
    });
    const loginValidator = T.Union([
      T.Object({ username: T.String, password: T.String }),
      T.Object({ email: T.String, password: T.String }),
    ]);

    test('validates a correct person object', () => {
      const result: InferType<typeof personValidator> = {
        name: 'Alice',
        age: 30,
      };
      expect(personValidator.validate(result)).toBe(true);
    });

    test('invalidates person object with missing age', () => {
      // @ts-expect-error missing age
      const missingAge: InferType<typeof personValidator> = { name: 'Bob' };
      expect(personValidator.validate(missingAge)).toBe(false);
    });

    test('validates person object with extra property', () => {
      const extraProperty = {
        name: 'Carol',
        age: 25,
        email: 'carol@example.com',
      };
      const resultWithExtraProp: InferType<typeof personValidator> =
        extraProperty;
      expect(personValidator.validate(resultWithExtraProp)).toBe(true);
    });

    test('invalidates person object with wrong type for age', () => {
      const wrongTypeAge: InferType<typeof personValidator> = {
        name: 'Dave',
        // @ts-expect-error should be number
        age: '30',
      };
      expect(personValidator.validate(wrongTypeAge)).toBe(false);
    });

    test('invalidates person object with null name', () => {
      const nullName: InferType<typeof personValidator> = {
        // @ts-expect-error should not be null
        name: null,
        age: 40,
      };
      expect(personValidator.validate(nullName)).toBe(false);
    });

    test('invalidates person object with undefined name', () => {
      const undefinedName: InferType<typeof personValidator> = {
        // @ts-expect-error should not be undefined
        name: undefined,
        age: 40,
      };
      expect(personValidator.validate(undefinedName)).toBe(false);
    });

    test('validates a correct employee object', () => {
      const validEmployee: InferType<typeof employeeValidator> = {
        id: 1,
        person: { name: 'Eve', age: 29 },
      };
      expect(employeeValidator.validate(validEmployee)).toBe(true);
    });

    test('invalidates employee object with wrong type in nested person', () => {
      const invalidEmployee: InferType<typeof employeeValidator> = {
        id: 2,
        person: {
          name: 'Frank',
          // @ts-expect-error should be number
          age: 'thirty',
        },
      };
      expect(employeeValidator.validate(invalidEmployee)).toBe(false);
    });

    test('invalidates employee object missing person', () => {
      // @ts-expect-error missing person
      const missingPerson: InferType<typeof employeeValidator> = { id: 3 };
      expect(employeeValidator.validate(missingPerson)).toBe(false);
    });

    test('invalidates employee object missing person undefined', () => {
      const missingPerson: InferType<typeof employeeValidator> = {
        id: 3,
        // @ts-expect-error missing person
        person: undefined,
      };
      expect(employeeValidator.validate(missingPerson)).toBe(false);
    });

    test('invalidates an empty person object', () => {
      // @ts-expect-error missing person
      const emptyObject: InferType<typeof personValidator> = {};
      expect(personValidator.validate(emptyObject)).toBe(false);
    });

    test('validates an array of correct people', () => {
      const validPeople: InferType<typeof peopleValidator> = [
        { name: 'Grace', age: 22 },
        { name: 'Heidi', age: 27 },
      ];
      expect(peopleValidator.validate(validPeople)).toBe(true);
    });

    test('invalidates an array with an incorrect person', () => {
      const invalidPeople: InferType<typeof peopleValidator> = [
        { name: 'Ivan', age: 35 },
        {
          name: 'Judy',
          // @ts-expect-error should be number
          age: 'thirty',
        },
      ];
      expect(peopleValidator.validate(invalidPeople)).toBe(false);
    });

    test('validates person object with optional age', () => {
      // @ts-expect-error missing age
      const validOptional: InferType<typeof optionalValidator> = {
        name: 'Kate',
      };
      expect(optionalValidator.validate(validOptional)).toBe(true);
    });

    test('optional validator with undefined', () => {
      const optional: InferType<typeof optionalValidator> = {
        name: 'Leo',
        age: undefined,
      };
      expect(optionalValidator.validate(optional)).toBe(true);
    });

    test('validates union login with username and password', () => {
      const validLogin1: InferType<typeof loginValidator> = {
        username: 'user1',
        password: 'pass1',
      };
      expect(loginValidator.validate(validLogin1)).toBe(true);
    });

    test('validates union login with email and password', () => {
      const validLogin2: InferType<typeof loginValidator> = {
        email: 'user@example.com',
        password: 'pass2',
      };
      expect(loginValidator.validate(validLogin2)).toBe(true);
    });

    test('invalidates union login missing password', () => {
      // @ts-expect-error missing password
      const invalidLogin: InferType<typeof loginValidator> = {
        username: 'user3',
      };
      expect(loginValidator.validate(invalidLogin)).toBe(false);
    });
  });

  test('UnionValidator should validate union types', () => {
    const stringOrNumberValidator = T.Union([T.String, T.Number]);
    expect(stringOrNumberValidator.validate('hello')).toBe(true);
    expect(stringOrNumberValidator.validate(42)).toBe(true);
    expect(stringOrNumberValidator.validate(true)).toBe(false);
    expectType<string | number, InferType<typeof stringOrNumberValidator>>(
      null as any,
    );
  });

  test('OptionalValidator should validate optional values', () => {
    const optionalStringValidator = T.Optional(T.String);
    expect(optionalStringValidator.validate('hello')).toBe(true);
    expect(optionalStringValidator.validate(undefined)).toBe(true);
    expect(optionalStringValidator.validate(123)).toBe(false);
    expectType<string | undefined, InferType<typeof optionalStringValidator>>(
      null as any,
    );
  });
});
