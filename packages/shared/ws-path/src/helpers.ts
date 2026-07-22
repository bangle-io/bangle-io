import { PATH_SEPARATOR } from './constants';

// joins into path, will not remove leading or trailing slashes
// if '' empty string, it will be filtered out,
// will prevent having `//` in the joined path
export function pathJoin(...args: string[]): string {
  return args
    .filter((part) => part !== '')
    .map((part, index) => {
      if (index === 0) {
        // Remove trailing slashes from the first part
        return part.replace(/\/+$/, '');
      }
      // Remove leading and trailing slashes from subsequent parts
      return part.replace(/^\/+|\/+$/g, '');
    })
    .join(PATH_SEPARATOR);
}
