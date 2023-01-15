import { vars } from '@bangle.io/css-vars';

export const width = {
  auto: 'auto',
  ...vars.space,
  screen: '100vw',
};

export const maxWidth = {
  none: 'none',
  ...vars.space,
  screen: '100vw',
};

export const height = {
  auto: 'auto',
  ...vars.space,
  screen: '100vh',
};

export const maxHeight = {
  none: 'none',
  ...vars.space,
  screen: '100vh',
};

export const containers = Object.fromEntries(
  Object.entries(vars.space).map(([k, v]) => [k, `(min-width: ${v})`]),
);
