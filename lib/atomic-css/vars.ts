import { tokens, walkObject } from './tokens';

// css vars in the var(--xyz) format
export const vars = walkObject(tokens, (value, path): string => {
  const raw = createRawVar(path);

  return `var(${raw})`;
}) as typeof tokens;

// css vars in the --xyz format
export const cssCustomProperties = walkObject(tokens, (value, path): string => {
  return createRawVar(path);
});

function createRawVar(path: string[]): string {
  const id = path.join('-');

  if (/^[a-zA-Z0-9_-]*$/g.test(id)) {
    return `--BV-${id}`;
  }

  throw new Error(`Invalid id ${id}`);
}
