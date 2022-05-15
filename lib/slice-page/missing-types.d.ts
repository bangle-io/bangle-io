declare module 'wouter/matcher' {
  import type { Key } from 'path-to-regexp';

  export default function makeMatcher(
    pathToRegexp: (
      path: string,
      keys: Key[],
      options: any,
    ) => { regexp: RegExp; keys: Key[] },
  ): (path: string, pathname: string) => [boolean, any];
}
