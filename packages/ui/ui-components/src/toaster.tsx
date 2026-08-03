import { useIsMobile } from '@bangle.io/ui-misc';
import React from 'react';
import { Toaster as Sonner, toast } from 'sonner';

type SonnerProps = React.ComponentProps<typeof Sonner>;

type ToasterProps = SonnerProps & {
  /** Overrides the toast position below the shared mobile breakpoint. */
  mobilePosition?: SonnerProps['position'];
};

const Toaster = ({ mobilePosition, position, ...props }: ToasterProps) => {
  const isMobile = useIsMobile();

  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      position={isMobile ? (mobilePosition ?? position) : position}
      {...props}
    />
  );
};

export { Toaster, toast };
