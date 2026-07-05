import { cn } from '@bangle.io/ui-misc';
import * as React from 'react';

// Base UI ships no standalone Label primitive (labels live in `Field`), and the
// app pairs an explicit `htmlFor` with a control `id`. Keep `htmlFor`/`children`
// explicit so the association is required and the a11y linter is satisfied.
function Label({
  className,
  htmlFor,
  children,
  ...props
}: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      htmlFor={htmlFor}
      className={cn(
        'flex select-none items-center gap-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export { Label };
