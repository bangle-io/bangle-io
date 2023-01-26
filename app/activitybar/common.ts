import type React from 'react';

import { vars } from '@bangle.io/css-vars';

export const ButtonStyleOBj: {
  normal: React.CSSProperties;
  hover: React.CSSProperties;
  press: React.CSSProperties;
} = {
  normal: {
    borderRadius: 0,
    color: vars.misc.activitybarText,
    padding: 0,
  },
  hover: {
    backgroundColor: vars.misc.activitybarBtnBgPress,
  },
  press: {
    backgroundColor: vars.misc.activitybarBtnBgPress,
  },
};
