import { cn } from '@bangle.io/ui-misc';
import type { ComponentType, ReactNode } from 'react';
import * as React from 'react';

export type SettingsNavItem = {
  id: string;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

export function SettingsPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      {children}
    </div>
  );
}

export function SettingsPageHeader({
  backHref,
  backLabel,
  backIcon,
  eyebrow,
  title,
  nav,
}: {
  backHref: string;
  backLabel: string;
  backIcon: ReactNode;
  eyebrow: string;
  title: string;
  nav: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <a
        className="inline-flex w-fit items-center gap-2 rounded-md px-2 py-1 font-medium text-muted-foreground text-sm hover:bg-accent hover:text-accent-foreground"
        href={backHref}
      >
        {backIcon}
        <span>{backLabel}</span>
      </a>

      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-muted-foreground text-sm">{eyebrow}</p>
          <h1 className="font-semibold text-3xl tracking-normal">{title}</h1>
        </div>
        {nav}
      </div>
    </div>
  );
}

export function SettingsPageNav({
  activeId,
  ariaLabel,
  items,
}: {
  activeId: string;
  ariaLabel: string;
  items: readonly SettingsNavItem[];
}) {
  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === activeId;

        return (
          <a
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm',
              isActive
                ? 'bg-accent font-medium text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground',
            )}
            href={item.href}
            key={item.id}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

export function SettingsPageContent({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-9">{children}</div>;
}

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-semibold text-base">{title}</h2>
      <div className="overflow-hidden rounded-lg border bg-card/80 text-card-foreground">
        {children}
      </div>
    </section>
  );
}

export function SettingsRow({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="flex min-h-20 flex-col gap-4 border-border/70 border-t px-4 py-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0 space-y-1">
        <h3 className="font-medium text-sm leading-5">{title}</h3>
        <p className="max-w-2xl text-muted-foreground text-sm leading-5">
          {description}
        </p>
      </div>
      <div className="flex w-full shrink-0 items-center sm:w-auto sm:justify-end">
        {control}
      </div>
    </div>
  );
}
