export type Validator<T> = {
  validate: (value: unknown) => value is T;
  typeName: string;
  isOptional?: boolean;
};

const StringValidator: Validator<string> = {
  validate: (value: unknown): value is string => typeof value === 'string',
  typeName: 'string',
};

const NumberValidator: Validator<number> = {
  validate: (value: unknown): value is number => typeof value === 'number',
  typeName: 'number',
};

const BooleanValidator: Validator<boolean> = {
  validate: (value: unknown): value is boolean => typeof value === 'boolean',
  typeName: 'boolean',
};

const UndefinedValidator: Validator<undefined> = {
  validate: (value: unknown): value is undefined => value === undefined,
  typeName: 'undefined',
};

const NullValidator: Validator<null> = {
  validate: (value: unknown): value is null => value === null,
  typeName: 'null',
};

function ArrayValidator<T>(elementValidator: Validator<T>): Validator<T[]> {
  return {
    validate: (value: unknown): value is T[] =>
      Array.isArray(value) &&
      value.every((element) => elementValidator.validate(element)),
    typeName: `array-of-${elementValidator.typeName}`,
  };
}

function ObjectValidator<T extends Record<string, Validator<unknown>>>(
  shape: T,
): Validator<{ [K in keyof T]: InferType<T[K]> }> {
  return {
    validate: (value: unknown): value is { [K in keyof T]: InferType<T[K]> } =>
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.entries(shape).every(([key, validator]) =>
        validator.validate(Reflect.get(value, key)),
      ),
    typeName: 'object',
  };
}

function UnionValidator<T extends Validator<unknown>[]>(
  validators: T,
): Validator<InferType<T[number]>> {
  return {
    validate: (value: unknown): value is InferType<T[number]> =>
      validators.some((validator) => validator.validate(value)),
    typeName: 'union',
  };
}

function OptionalValidator<T>(
  validator: Validator<T>,
): Validator<T | undefined> {
  return {
    validate: (value: unknown): value is T | undefined =>
      value === undefined || validator.validate(value),
    typeName: `${validator.typeName}-or-undefined`,
    isOptional: true,
  };
}

export const T = {
  String: StringValidator,
  Number: NumberValidator,
  Boolean: BooleanValidator,
  Array: ArrayValidator,
  Object: ObjectValidator,
  // lets avoid using union and more complicated types for now
  // as there might be bugs
  Union: UnionValidator,
  Optional: OptionalValidator,
  Undefined: UndefinedValidator,
  Null: NullValidator,
};

export type InferType<T extends Validator<unknown>> =
  T extends Validator<infer U> ? U : never;
