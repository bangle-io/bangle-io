import { type ActionVariant, Button } from '@bangle.io/ui-components';
import React from 'react';

interface Action {
  label: string;
  variant?: ActionVariant;
  onClick: () => void;
}

interface ActionsProps {
  actions: Action[];
}

/** Renders a list of action buttons, typically used in notices or dialogs. */
export function Actions({ actions }: ActionsProps) {
  return (
    <div className="mt-3 flex flex-col justify-center gap-4 sm:flex-row">
      {actions.map((btn) => (
        <Button
          key={btn.label}
          onClick={btn.onClick}
          variant={btn.variant ?? 'default'}
        >
          {btn.label}
        </Button>
      ))}
    </div>
  );
}
