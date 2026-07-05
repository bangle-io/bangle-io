import { cn } from '@bangle.io/ui-misc';
import React from 'react';

type LabelProps = React.ComponentProps<'label'>;

// Base UI does not ship a standalone Label primitive; labels live inside
// `Field.Root` as `Field.Label`. Consumers here pair an explicit `htmlFor`
// with a control `id` (often within a grid layout where a `Field.Root`
// wrapper would break the columns), so a native `<label>` is the faithful
// replacement and keeps click-to-focus behavior without a Radix dependency.
// `htmlFor` is a first-class prop so the association is explicit and required.
function Label({ className, htmlFor, children, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      htmlFor={htmlFor}
      className={cn(
        'flex select-none items-center gap-2 font-medium text-sm leading-none peer-disabled:pointer-events-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 group-data-disabled:pointer-events-none group-data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export type { LabelProps };
export { Label };
