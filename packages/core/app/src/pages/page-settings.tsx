import { useCoreServices } from '@bangle.io/context';
import type { AppRouteInfo, ThemePreference } from '@bangle.io/types';
import {
  Button,
  cn,
  DropdownMenu,
  SettingsPage,
  ToggleGroup,
  ToggleGroupItem,
} from '@bangle.io/ui-components';
import { useAtom, useAtomValue } from 'jotai';
import { ArrowLeft, ChevronDown, Settings2 } from 'lucide-react';
import React from 'react';
import { AppHeader } from '../layout/app-header';
import { PageContentContainer } from '../layout/main-content-container';

const THEME_VALUES = [
  'system',
  'light',
  'dark',
] as const satisfies readonly ThemePreference[];

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: t.app.dialogs.changeTheme.options.system },
  { value: 'light', label: t.app.dialogs.changeTheme.options.light },
  { value: 'dark', label: t.app.dialogs.changeTheme.options.dark },
];

const SETTINGS_PAGES = [
  {
    id: 'general',
    label: t.app.settings.nav.general,
    route: 'settings-general' as const,
    icon: Settings2,
  },
] as const;

type SettingsPageId = (typeof SETTINGS_PAGES)[number]['id'];

function isThemePreference(value: string): value is ThemePreference {
  return THEME_VALUES.some((theme) => theme === value);
}

function getSettingsReturnTo(routeInfo: AppRouteInfo) {
  if (routeInfo.route !== 'settings-general') {
    return undefined;
  }

  return routeInfo.payload.returnTo;
}

function safeAppHref(href: string | undefined) {
  if (!href || !href.startsWith('/') || href.startsWith('//')) {
    return undefined;
  }

  return href;
}

export function PageSettings() {
  return <SettingsLayout activePage="general" />;
}

function SettingsLayout({ activePage }: { activePage: SettingsPageId }) {
  const { navigation, workbenchState } = useCoreServices();
  const routeInfo = useAtomValue(navigation.$routeInfo);
  const themePref = useAtomValue(workbenchState.$themePref);
  const [wideEditor, setWideEditor] = useAtom(workbenchState.$wideEditor);
  const returnTo = safeAppHref(getSettingsReturnTo(routeInfo));

  const backHref =
    returnTo ??
    navigation.toUri({
      route: 'welcome',
      payload: {},
    });
  const navItems = SETTINGS_PAGES.map((page) => ({
    id: page.id,
    label: page.label,
    href: navigation.toUri({
      route: page.route,
      payload: { returnTo },
    }),
    icon: page.icon,
  }));

  return (
    <>
      <AppHeader />
      <PageContentContainer respectEditorWidthPreference={false}>
        <SettingsPage.SettingsPageLayout>
          <SettingsPage.SettingsPageHeader
            backHref={backHref}
            backIcon={<ArrowLeft className="h-4 w-4 shrink-0" />}
            backLabel={t.app.settings.backToApp}
            eyebrow={t.app.settings.title}
            nav={
              <SettingsPage.SettingsPageNav
                activeId={activePage}
                ariaLabel={t.app.settings.title}
                items={navItems}
              />
            }
            title={t.app.settings.general.title}
          />

          <SettingsPage.SettingsPageContent>
            <SettingsPage.SettingsSection
              title={t.app.settings.general.appearanceSection}
            >
              <SettingsPage.SettingsRow
                control={
                  <ThemePreferenceSelect
                    onValueChange={(preference) => {
                      workbenchState.changeThemePreference(preference);
                    }}
                    value={themePref}
                  />
                }
                description={t.app.settings.general.themeDescription}
                title={t.app.settings.general.themeTitle}
              />
            </SettingsPage.SettingsSection>

            <SettingsPage.SettingsSection
              title={t.app.settings.general.editorSection}
            >
              <SettingsPage.SettingsRow
                control={
                  <SegmentedControl
                    aria-label={t.app.settings.general.wideEditorToggle}
                    onValueChange={(value) => {
                      if (value === 'default') {
                        setWideEditor(false);
                      }
                      if (value === 'wide') {
                        setWideEditor(true);
                      }
                    }}
                    type="single"
                    value={wideEditor ? 'wide' : 'default'}
                  >
                    <ToggleGroupItem
                      className={SEGMENTED_ITEM_CLASS}
                      value="default"
                    >
                      {t.app.settings.general.defaultWidth}
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      className={SEGMENTED_ITEM_CLASS}
                      value="wide"
                    >
                      {t.app.settings.general.wideWidth}
                    </ToggleGroupItem>
                  </SegmentedControl>
                }
                description={t.app.settings.general.wideEditorDescription}
                title={t.app.settings.general.wideEditorTitle}
              />
            </SettingsPage.SettingsSection>
          </SettingsPage.SettingsPageContent>
        </SettingsPage.SettingsPageLayout>
      </PageContentContainer>
    </>
  );
}

function ThemePreferenceSelect({
  value,
  onValueChange,
}: {
  value: ThemePreference;
  onValueChange: (value: ThemePreference) => void;
}) {
  const selectedLabel =
    THEME_OPTIONS.find((option) => option.value === value)?.label ??
    t.app.dialogs.changeTheme.options.system;

  return (
    <DropdownMenu.DropdownMenu>
      <DropdownMenu.DropdownMenuTrigger asChild>
        <Button
          aria-label={t.app.settings.general.themeLabel}
          className="h-9 w-full justify-between rounded-lg bg-muted/60 px-3 text-sm shadow-none sm:w-48"
          variant="outline"
        >
          <span>{selectedLabel}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenu.DropdownMenuTrigger>
      <DropdownMenu.DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenu.DropdownMenuRadioGroup
          onValueChange={(nextValue) => {
            if (isThemePreference(nextValue)) {
              onValueChange(nextValue);
            }
          }}
          value={value}
        >
          {THEME_OPTIONS.map((option) => (
            <DropdownMenu.DropdownMenuRadioItem
              key={option.value}
              value={option.value}
            >
              {option.label}
            </DropdownMenu.DropdownMenuRadioItem>
          ))}
        </DropdownMenu.DropdownMenuRadioGroup>
      </DropdownMenu.DropdownMenuContent>
    </DropdownMenu.DropdownMenu>
  );
}

const SEGMENTED_ITEM_CLASS =
  'h-8 min-w-16 rounded-md px-3 text-xs data-[state=on]:bg-background data-[state=on]:shadow-xs';

function SegmentedControl({
  children,
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroup>) {
  return (
    <ToggleGroup
      className={cn(
        'inline-flex rounded-lg bg-muted/60 p-1 shadow-inner',
        className,
      )}
      variant="default"
      {...props}
    >
      {children}
    </ToggleGroup>
  );
}
