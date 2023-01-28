const keys: { [k: string]: number } = Object.create(null);

export const expectType = <Type>(_: Type): void => void 0;

export function createKey(name: string) {
  if (name in keys) {
    return name + '$' + ++keys[name];
  }
  keys[name] = 0;

  return name + '$';
}

export type ReplaceReturnType<T extends (...args: any) => any, R> = T extends (
  ...args: infer P
) => any
  ? (...ag: P) => R
  : never;

function foo(s: string, f: boolean) {
  return s.length;
}

expectType<ReplaceReturnType<typeof foo, { l: boolean }>>(
  (s: string, f: boolean) => ({ l: false }),
);
