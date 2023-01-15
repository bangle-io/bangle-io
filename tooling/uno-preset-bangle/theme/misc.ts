import { vars } from '@bangle.io/css-vars';

export const lineWidth = vars.border.width;

export const spacing = { DEFAULT: '1rem', none: '0rem', ...vars.space };

export const borderRadius = {
  ...vars.border.radius,
  full: '9999px',
};

export const ringWidth = vars.ringWidth;
