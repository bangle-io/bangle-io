import { useCoreServices } from '@bangle.io/context';
import { Breadcrumb, buttonVariants, cn } from '@bangle.io/ui-components';
import { Home } from 'lucide-react';
import React from 'react';

/** The app home destination stays the same on every page. */
export function HomeBreadcrumbLink() {
  const { navigation } = useCoreServices();
  return (
    <Breadcrumb.BreadcrumbLink
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        'h-7 w-7',
      )}
      href={navigation.toUri({ route: 'welcome', payload: {} })}
      title={t.app.common.home}
      aria-label={t.app.common.home}
    >
      <Home size={16} />
    </Breadcrumb.BreadcrumbLink>
  );
}
