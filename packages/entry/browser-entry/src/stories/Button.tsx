import React, { type FC } from 'react';

import './button.css';

interface ButtonProps {
  /** Is this the principal call to action on the page? */
  primary?: boolean;
  /** What background color to use */
  backgroundColor?: string;
  /** How large should the button be? */
  size?: 'small' | 'medium' | 'large';
  /** Button contents */
  label: string;
  /** Optional click handler */
  onClick?: () => void;
}

/** Primary UI component for user interaction */
export const Button: FC<ButtonProps> = ({
  primary = false,
  backgroundColor,
  size = 'medium',
  label,
  ...props
}) => {
  return (
    <button
      type="button"
      className={'bg-pink-700'}
      style={backgroundColor ? { backgroundColor } : undefined}
      {...props}
    >
      {label}
    </button>
  );
};
