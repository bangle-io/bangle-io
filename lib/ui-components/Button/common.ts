import React from 'react';

import type { Tone } from '@bangle.io/constants';
import { TONE } from '@bangle.io/constants';
import { vars } from '@bangle.io/css-vars';
import { cx } from '@bangle.io/utils';

export type BtnSize = 'xs' | 'sm' | 'md' | 'lg';

export const BUTTON_VARIANT = {
  SOLID: 'solid',
  GHOST: 'ghost',
  SOFT: 'soft',
  TRANSPARENT: 'transparent',
} as const;

export type ButtonVariant =
  (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];

export function BtnIcon({
  icon,
  size,
  side = 'left',
  text,
}: {
  icon?: React.ReactNode;
  size: BtnSize;
  side: 'left' | 'right';
  text: React.ReactNode;
}) {
  if (!React.isValidElement(icon)) {
    return null;
  }
  let className = '';

  if (text) {
    if (size === 'xs') {
      className = cx(className, side === 'left' ? 'mr-0_5' : 'ml-0_5');
    } else {
      className = cx(className, side === 'left' ? 'mr-1' : 'ml-1');
    }
  }

  switch (size) {
    case 'xs': {
      className = cx(className, 'w-4 h-4');
      break;
    }
    case 'sm': {
      className = cx(className, 'w-5 h-5');
      break;
    }
    case 'md': {
      className = cx(className, 'w-6 h-6');
      break;
    }
    case 'lg': {
      className = cx(className, 'w-7 h-7');
      break;
    }
    default: {
      let x: never = size;
      throw new Error('Invalid size');
    }
  }

  if (
    typeof icon.props.className === 'string' &&
    (icon.props.className.includes('w-') || icon.props.className.includes('h-'))
  ) {
    console.warn(
      'Icon size should not be set in Button Icon! Found class ' +
        icon.props.className,
    );
  }

  return React.cloneElement(icon, {
    className: cx(icon.props.className, className),
  } as any);
}

interface ButtonStyles {
  color: string;
  buttonBgColor: string;
  hoverBgColor: string;
  hoverColor: string;
  pressedBgColor: string;
  disabledBgColor: string;
  disabledColor: string;
}

export function createStyleObj(
  buttonStyles: ButtonStyles,
  override: React.CSSProperties | undefined,
  opts: {
    isHovered: boolean;
    isPressed: boolean;
    isDisabled?: boolean;
    variant: ButtonVariant;
  },
): React.CSSProperties {
  let style: React.CSSProperties = {};

  const isGhost = opts.variant === BUTTON_VARIANT.GHOST;

  const setBorder = (color: string) => {
    style.border = `2px solid ${color}`;
  };
  const setBgColor = (color: string) => {
    style.backgroundColor = color;
  };

  style.color = buttonStyles.color;

  if (isGhost) {
    setBorder(buttonStyles.color);

    if (opts.isDisabled) {
      setBorder(buttonStyles.disabledColor);
    }
  }

  setBgColor(buttonStyles.buttonBgColor);

  if (opts.isDisabled) {
    setBgColor(buttonStyles.disabledBgColor);
    style.color = buttonStyles.disabledColor;
  }

  if (opts.isHovered && !opts.isDisabled) {
    style.color = buttonStyles.hoverColor;
    setBgColor(buttonStyles.hoverBgColor);
  }

  if (opts.isPressed && !opts.isDisabled) {
    setBgColor(buttonStyles.pressedBgColor);
    isGhost && setBorder(buttonStyles.hoverColor);
  }

  return { ...style, ...override };
}

export const variantMapping: Record<
  ButtonVariant,
  Record<Tone, ButtonStyles>
> = {
  [BUTTON_VARIANT.SOLID]: {
    [TONE.CAUTION]: {
      color: vars.color.caution.solidText,
      buttonBgColor: vars.color.caution.solid,
      hoverBgColor: vars.color.caution.solidStrong,
      hoverColor: vars.color.caution.solidText,
      pressedBgColor: vars.color.caution.solidStronger,
      disabledBgColor: vars.color.caution.solidFaint,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.CRITICAL]: {
      color: vars.color.critical.solidText,
      buttonBgColor: vars.color.critical.solid,
      hoverBgColor: vars.color.critical.solidStrong,
      hoverColor: vars.color.critical.solidText,
      pressedBgColor: vars.color.critical.solidStronger,
      disabledBgColor: vars.color.critical.solidFaint,
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.NEUTRAL]: {
      color: vars.color.neutral.solidText,
      buttonBgColor: vars.color.neutral.solid,
      hoverBgColor: vars.color.neutral.solidStrong,
      hoverColor: vars.color.neutral.solidText,
      pressedBgColor: vars.color.neutral.solidStronger,
      disabledBgColor: vars.color.neutral.solidFaint,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.SECONDARY]: {
      color: vars.color.secondary.solidText,
      buttonBgColor: vars.color.secondary.solid,
      hoverBgColor: vars.color.secondary.solidStrong,
      hoverColor: vars.color.secondary.solidText,
      pressedBgColor: vars.color.secondary.solidStronger,
      disabledBgColor: vars.color.secondary.solidFaint,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.POSITIVE]: {
      color: vars.color.positive.solidText,
      buttonBgColor: vars.color.positive.solid,
      hoverBgColor: vars.color.positive.solidStrong,
      hoverColor: vars.color.positive.solidText,
      pressedBgColor: vars.color.positive.solidStronger,
      disabledBgColor: vars.color.positive.solidFaint,
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.PROMOTE]: {
      color: vars.color.promote.solidText,
      buttonBgColor: vars.color.promote.solid,
      hoverBgColor: vars.color.promote.solidStrong,
      hoverColor: vars.color.promote.solidText,
      pressedBgColor: vars.color.promote.solidStronger,
      disabledBgColor: vars.color.promote.solidFaint,
      disabledColor: vars.color.neutral.textDisabled,
    },
  },

  [BUTTON_VARIANT.GHOST]: {
    [TONE.CAUTION]: {
      color: vars.color.caution.solid,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.solidFaint,
      hoverColor: vars.color.caution.solidStrong,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.CRITICAL]: {
      color: vars.color.critical.solid,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.solidFaint,
      hoverColor: vars.color.critical.solidStrong,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.NEUTRAL]: {
      color: vars.color.neutral.solid,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.solidFaint,
      hoverColor: vars.color.neutral.solidStrong,
      pressedBgColor: vars.color.neutral.solidSubdued,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.SECONDARY]: {
      color: vars.color.secondary.solidText,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.solidFaint,
      hoverColor: vars.color.secondary.solidText,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.POSITIVE]: {
      color: vars.color.positive.solid,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.solidFaint,
      hoverColor: vars.color.positive.solidStrong,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.PROMOTE]: {
      color: vars.color.promote.solid,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.solidFaint,
      hoverColor: vars.color.promote.solidStrong,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
  },

  [BUTTON_VARIANT.SOFT]: {
    [TONE.CAUTION]: {
      color: vars.color.caution.solid,
      buttonBgColor: vars.color.neutral.borderSubdued,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.caution.solid,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.CRITICAL]: {
      color: vars.color.critical.solid,
      buttonBgColor: vars.color.neutral.borderSubdued,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.critical.solid,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.NEUTRAL]: {
      color: vars.color.neutral.text,
      buttonBgColor: vars.color.neutral.borderSubdued,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.neutral.text,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.SECONDARY]: {
      color: vars.color.secondary.solidText,
      buttonBgColor: vars.color.neutral.borderSubdued,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.neutral.text,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.POSITIVE]: {
      color: vars.color.positive.solid,
      buttonBgColor: vars.color.neutral.borderSubdued,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.positive.solid,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.PROMOTE]: {
      color: vars.color.promote.solid,
      buttonBgColor: vars.color.neutral.borderSubdued,
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.promote.solid,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
  },

  [BUTTON_VARIANT.TRANSPARENT]: {
    [TONE.CAUTION]: {
      color: vars.color.caution.solid,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.caution.solidStrong,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.CRITICAL]: {
      color: vars.color.critical.solid,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.critical.solidStrong,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.NEUTRAL]: {
      color: vars.color.neutral.text,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.neutral.text,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
    [TONE.SECONDARY]: {
      color: vars.color.neutral.textSubdued,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.neutral.text,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.POSITIVE]: {
      color: vars.color.positive.solid,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.positive.solidStrong,
      pressedBgColor: vars.color.neutral.borderStrong,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },

    [TONE.PROMOTE]: {
      color: vars.color.promote.solid,
      buttonBgColor: 'transparent',
      hoverBgColor: vars.color.neutral.border,
      hoverColor: vars.color.promote.solidStrong,
      pressedBgColor: vars.color.neutral.border,
      disabledBgColor: 'transparent',
      disabledColor: vars.color.neutral.textDisabled,
    },
  },
};
