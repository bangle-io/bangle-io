import { vars } from '@bangle.io/ui-vars';

const baseSize = vars.size;

export const width = {
  auto: 'auto',
  ...baseSize,
  screen: '100vw',
};

export const maxWidth = {
  none: 'none',
  ...baseSize,
  screen: '100vw',
};

export const height = {
  auto: 'auto',
  ...baseSize,
  screen: '100vh',
};

export const maxHeight = {
  none: 'none',
  ...baseSize,
  screen: '100vh',
};

export const containers = Object.fromEntries(
  Object.entries(baseSize).map(([k, v]) => [k, `(min-width: ${v})`]),
);
