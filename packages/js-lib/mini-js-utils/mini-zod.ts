export type Validator<T> = {
  validate: (value: any) => value is T;
  typeName: string;
  isOptional?: boolean;
};

const StringValidator: Validator<string> = {
  validate: (value: any): value is string => typeof value === 'string',
  typeName: 'string',
};

const NumberValidator: Validator<number> = {
  validate: (value: any): value is number => typeof value === 'number',
  typeName: 'number',
};

const BooleanValidator: Validator<boolean> = {
  validate: (value: any): value is boolean => typeof value === 'boolean',
  typeName: 'boolean',
};

const UndefinedValidator: Validator<undefined> = {
  validate: (value: any): value is undefined => value === undefined,
  typeName: 'undefined',
};

const NullValidator: Validator<null> = {
  validate: (value: any): value is null => value === null,
  typeName: 'null',
};

function ArrayValidator<T>(elementValidator: Validator<T>): Validator<T[]> {
  return {
    validate: (value: any): value is T[] =>
      Array.isArray(value) &&
      value.every((element) => elementValidator.validate(element)),
    typeName: `array-of-${elementValidator.typeName}`,
  };
}

function ObjectValidator<T extends { [key: string]: Validator<any> }>(
  shape: T,
): Validator<{ [K in keyof T]: InferType<T[K]> }> {
  return {
    validate: (value: any): value is { [K in keyof T]: InferType<T[K]> } =>
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(shape).every((key) => shape[key]?.validate(value[key])),
    typeName: 'object',
  };
}

function UnionValidator<T extends Validator<any>[]>(
  validators: T,
): Validator<InferType<T[number]>> {
  return {
    validate: (value: any): value is InferType<T[number]> =>
      validators.some((validator) => validator.validate(value)),
    typeName: 'union',
  };
}

function OptionalValidator<T>(
  validator: Validator<T>,
): Validator<T | undefined> {
  return {
    validate: (value: any): value is T | undefined =>
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

export type InferType<T extends Validator<any>> = T extends Validator<infer U>
  ? U
  : never;
