import { tokens, walkObject } from './tokens';

export const vars = walkObject(tokens, (value, path): string => {
  return createVar(path.join('-'));
}) as typeof tokens;

function createVar(id: string): string {
  if (/^[a-zA-Z0-9_-]*$/g.test(id)) {
    return `var(--BV-${id})`;
  }

  throw new Error(`Invalid id ${id}`);
}
