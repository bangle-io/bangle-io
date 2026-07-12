import { FRIENDLY_ID } from '@bangle.io/config';
import {
  ASSET_LOCATION_PREFERENCES,
  isAssetLocationPreference,
  isSettingsRouteInfo,
  SETTINGS_PAGE_DEFINITIONS,
  type SettingsPageId,
} from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import type {
  AppRouteInfo,
  AssetLocationPreference,
  ThemePreference,
} from '@bangle.io/types';
import {
  Button,
  cn,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SettingsPage,
} from '@bangle.io/ui-components';
import { useAtom, useAtomValue } from 'jotai';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Download,
  type LucideIcon,
  Settings2,
} from 'lucide-react';
import React from 'react';
import {
  getPwaInstallSnapshot,
  promptPwaInstall,
  subscribePwaInstallPrompt,
} from '../common/pwa-install';
import { AppHeader } from '../layout/app-header';
import { PageContentContainer } from '../layout/main-content-container';
import { WorkspacesSettingsPage } from './page-settings-workspaces';

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

const ASSET_LOCATION_LABELS: Record<AssetLocationPreference, string> = {
  'assets-folder': t.app.settings.general.assetsFolder,
  adjacent: t.app.settings.general.adjacentToNote,
};

const ASSET_LOCATION_OPTIONS: Array<{
  value: AssetLocationPreference;
  label: string;
}> = ASSET_LOCATION_PREFERENCES.map((value) => ({
  value,
  label: ASSET_LOCATION_LABELS[value],
}));

// Base UI's `Select.Value` renders the raw value while the popup is closed
// unless the Root is given an `items` value→label map to resolve the label.
const ASSET_LOCATION_ITEMS: Record<string, string> = Object.fromEntries(
  ASSET_LOCATION_OPTIONS.map((option) => [option.value, option.label]),
);
const THEME_ITEMS: Record<string, string> = Object.fromEntries(
  THEME_OPTIONS.map((option) => [option.value, option.label]),
);

// Presentation for each settings page. Keyed by SettingsPageId so adding a page
// to SETTINGS_PAGE_DEFINITIONS (in @bangle.io/constants) forces a matching entry
// here at compile time.
const SETTINGS_PAGE_META: Record<
  SettingsPageId,
  { label: string; icon: LucideIcon; title: string }
> = {
  general: {
    label: t.app.settings.nav.general,
    icon: Settings2,
    title: t.app.settings.general.title,
  },
  workspaces: {
    label: t.app.settings.nav.workspaces,
    icon: BriefcaseBusiness,
    title: t.app.settings.workspaces.title,
  },
};

function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_VALUES.some((theme) => theme === value);
}

function getSettingsReturnTo(routeInfo: AppRouteInfo) {
  if (!isSettingsRouteInfo(routeInfo)) {
    return undefined;
  }

  return routeInfo.payload.returnTo;
}

function hasUnsafeAppHrefCharacter(href: string) {
  return [...href].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return (
      character === '\\' ||
      codePoint <= 0x1f ||
      (codePoint >= 0x7f && codePoint <= 0x9f)
    );
  });
}

/** @internal Exported from this module only for focused URL-boundary tests. */
export function safeAppHref(
  href: string | undefined,
  currentHref = window.location.href,
) {
  if (!href || hasUnsafeAppHrefCharacter(href)) {
    return undefined;
  }

  try {
    const currentUrl = new URL(currentHref);
    const targetUrl = new URL(href, currentUrl);

    if (
      !href.startsWith('/') ||
      href.startsWith('//') ||
      targetUrl.pathname.startsWith('//') ||
      targetUrl.protocol !== currentUrl.protocol ||
      targetUrl.host !== currentUrl.host
    ) {
      return undefined;
    }

    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
  } catch {
    return undefined;
  }
}

export function PageSettings() {
  const { navigation } = useCoreServices();
  const routeInfo = useAtomValue(navigation.$routeInfo);
  const activePage =
    SETTINGS_PAGE_DEFINITIONS.find((page) => page.route === routeInfo.route)
      ?.id ?? 'general';

  return <SettingsLayout activePage={activePage} />;
}

function SettingsLayout({ activePage }: { activePage: SettingsPageId }) {
  const { navigation, workbenchState } = useCoreServices();
  const routeInfo = useAtomValue(navigation.$routeInfo);
  const themePref = useAtomValue(workbenchState.$themePref);
  const [wideEditor, setWideEditor] = useAtom(workbenchState.$wideEditor);
  const pwaInstall = usePwaInstallPrompt();
  const [assetLocationPreference, setAssetLocationPreference] = useAtom(
    workbenchState.$assetLocationPreference,
  );
  const returnTo = safeAppHref(getSettingsReturnTo(routeInfo));

  const backHref =
    returnTo ??
    navigation.toUri({
      route: 'welcome',
      payload: {},
    });
  const navItems = SETTINGS_PAGE_DEFINITIONS.map((page) => ({
    id: page.id,
    label: SETTINGS_PAGE_META[page.id].label,
    href: navigation.toUri({
      route: page.route,
      payload: { returnTo },
    }),
    icon: SETTINGS_PAGE_META[page.id].icon,
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
            title={SETTINGS_PAGE_META[activePage].title}
          />

          <SettingsPage.SettingsPageContent>
            {activePage === 'general' ? (
              <>
                <SettingsPage.SettingsSection
                  title={t.app.settings.general.appSection}
                >
                  <SettingsPage.SettingsRow
                    control={
                      <code
                        className="rounded-md bg-muted px-2.5 py-1 font-mono text-muted-foreground text-sm"
                        data-testid="app-version"
                      >
                        {FRIENDLY_ID}
                      </code>
                    }
                    description={t.app.settings.general.versionDescription}
                    title={t.app.settings.general.versionTitle}
                  />
                  {pwaInstall.canInstall || pwaInstall.isInstalling ? (
                    <SettingsPage.SettingsRow
                      control={
                        <Button
                          disabled={pwaInstall.isInstalling}
                          onClick={() => {
                            void pwaInstall.install();
                          }}
                          type="button"
                        >
                          <Download className="h-4 w-4" />
                          {pwaInstall.isInstalling
                            ? t.app.settings.general.installingPwa
                            : t.app.settings.general.installPwaButton}
                        </Button>
                      }
                      description={t.app.settings.general.installPwaDescription}
                      title={t.app.settings.general.installPwaTitle}
                    />
                  ) : null}
                </SettingsPage.SettingsSection>

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
                      <AssetLocationSelect
                        onValueChange={setAssetLocationPreference}
                        value={assetLocationPreference}
                      />
                    }
                    description={
                      t.app.settings.general.assetLocationDescription
                    }
                    title={t.app.settings.general.assetLocationTitle}
                  />
                  <SettingsPage.SettingsRow
                    control={
                      <SegmentedControl
                        aria-label={t.app.settings.general.wideEditorToggle}
                        onValueChange={(value) => {
                          setWideEditor(value === 'wide');
                        }}
                        value={wideEditor ? 'wide' : 'default'}
                      >
                        <RadioGroupItem
                          className={SEGMENTED_ITEM_CLASS}
                          value="default"
                        >
                          {t.app.settings.general.defaultWidth}
                        </RadioGroupItem>
                        <RadioGroupItem
                          className={SEGMENTED_ITEM_CLASS}
                          value="wide"
                        >
                          {t.app.settings.general.wideWidth}
                        </RadioGroupItem>
                      </SegmentedControl>
                    }
                    description={t.app.settings.general.wideEditorDescription}
                    title={t.app.settings.general.wideEditorTitle}
                  />
                </SettingsPage.SettingsSection>
              </>
            ) : (
              <WorkspacesSettingsPage />
            )}
          </SettingsPage.SettingsPageContent>
        </SettingsPage.SettingsPageLayout>
      </PageContentContainer>
    </>
  );
}

function usePwaInstallPrompt() {
  const snapshot = React.useSyncExternalStore(
    subscribePwaInstallPrompt,
    getPwaInstallSnapshot,
    getPwaInstallSnapshot,
  );

  return {
    ...snapshot,
    install: promptPwaInstall,
  };
}

function AssetLocationSelect({
  value,
  onValueChange,
}: {
  value: AssetLocationPreference;
  onValueChange: (value: AssetLocationPreference) => void;
}) {
  return (
    <Select
      items={ASSET_LOCATION_ITEMS}
      onValueChange={(nextValue) => {
        if (isAssetLocationPreference(nextValue)) {
          onValueChange(nextValue);
        }
      }}
      value={value}
    >
      <SelectTrigger
        aria-label={t.app.settings.general.assetLocationTitle}
        className="w-full sm:w-48"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="min-w-44">
        {ASSET_LOCATION_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ThemePreferenceSelect({
  value,
  onValueChange,
}: {
  value: ThemePreference;
  onValueChange: (value: ThemePreference) => void;
}) {
  return (
    <Select
      items={THEME_ITEMS}
      onValueChange={(nextValue) => {
        if (isThemePreference(nextValue)) {
          onValueChange(nextValue);
        }
      }}
      value={value}
    >
      <SelectTrigger
        aria-label={t.app.settings.general.themeLabel}
        className="w-full sm:w-48"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="min-w-40">
        {THEME_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const SEGMENTED_ITEM_CLASS =
  'h-8 min-w-16 rounded-md px-3 text-xs data-[checked]:bg-background data-[checked]:shadow-xs';

function SegmentedControl({
  children,
  className,
  ...props
}: React.ComponentProps<typeof RadioGroup>) {
  return (
    <RadioGroup
      className={cn(
        'inline-flex rounded-lg bg-muted/60 p-1 shadow-inner',
        className,
      )}
      {...props}
    >
      {children}
    </RadioGroup>
  );
}
