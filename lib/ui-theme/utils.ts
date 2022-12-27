// @ts-expect-error
import { parse as parseGradient } from 'gradient-parser';
import { getLuminance } from 'polished';

import { isPlainObject } from '@bangle.io/mini-js-utils';

export function cx(...args: any[]): string {
  let classes: string = '';
  for (const arg of args) {
    if (!arg) {
      continue;
    }
    classes += arg + ' ';
  }

  return classes;
}

type LinearGradients = Array<{
  colorStops: Array<{
    type: string;
    value: string;
  }>;
}>;

const getLinearGradientColors = (color: string) => {
  const gradients: LinearGradients = parseGradient(color);

  return gradients[0]!.colorStops.map(({ type, value }) => {
    if (typeof value !== 'string') {
      throw new Error(
        'Gradient parsing in Braid currently only supports hex/literal values',
      );
    }

    return `${type === 'hex' ? '#' : ''}${value}`;
  });
};

export const isLight = (inputColor: string) => {
  const colors = /^linear-gradient/.test(inputColor)
    ? getLinearGradientColors(inputColor)
    : [inputColor];

  return colors.some((color) => getLuminance(color) > 0.6);
};

/**
 * replaces object with values with the key path
 */
export function replaceValuesWithKeyPath<T>(obj: T, prefix: string = ''): T {
  const recurse = (object: any, keys: string[] = []): any => {
    if (!Array.isArray(object) && isPlainObject(object)) {
      return Object.fromEntries(
        Object.entries(object).map(([key, value]) => {
          return [key, recurse(value, [...keys, key])];
        }),
      ) as any;
    }

    if (typeof object === 'string') {
      const result = keys.join('-');

      if (result.includes('.')) {
        throw new Error(
          `The key path "${result}" contains a dot. This is not allowed.`,
        );
      }

      return (prefix + result) as any;
    }

    throw new Error('Object must have all key values as strings');
  };

  return recurse(obj);
}
