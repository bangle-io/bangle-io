import type { ExpoConfig } from 'expo/config';

type AppVariant = 'development' | 'preview' | 'production';

const VARIANT_CONFIG: Record<
  AppVariant,
  {
    readonly appName: string;
    readonly scheme: string;
    readonly iosBundleIdentifier: string;
    readonly androidPackage: string;
  }
> = {
  development: {
    appName: 'Bangle Dev',
    scheme: 'bangle-dev',
    iosBundleIdentifier: 'io.bangle.app.dev',
    androidPackage: 'io.bangle.app.dev',
  },
  preview: {
    appName: 'Bangle Preview',
    scheme: 'bangle-preview',
    iosBundleIdentifier: 'io.bangle.app.preview',
    androidPackage: 'io.bangle.app.preview',
  },
  production: {
    appName: 'Bangle',
    scheme: 'bangle',
    iosBundleIdentifier: 'io.bangle.app',
    androidPackage: 'io.bangle.app',
  },
};

function resolveAppVariant(value: string | undefined): AppVariant {
  switch (value) {
    case 'development':
    case 'preview':
    case 'production':
      return value;
    default:
      return 'production';
  }
}

const APP_VARIANT = resolveAppVariant(process.env['APP_VARIANT']);
const variant = VARIANT_CONFIG[APP_VARIANT];

// URL the WebView shell loads. Point this at a LAN Vite dev server
// (e.g. http://192.168.1.20:5173) for a live dev loop against local code.
const BANGLE_WEB_URL =
  process.env['EXPO_PUBLIC_BANGLE_WEB_URL'] ?? 'https://app.bangle.io';

// Set by `eas init` / the EAS dashboard. Required for EAS builds only;
// local `expo start` works without it.
const EAS_PROJECT_ID = process.env['EAS_PROJECT_ID'];

const config: ExpoConfig = {
  name: variant.appName,
  slug: 'bangle-io',
  platforms: ['ios', 'android'],
  scheme: variant.scheme,
  version: '0.1.0',
  runtimeVersion: {
    policy: 'appVersion',
  },
  orientation: 'default',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: variant.iosBundleIdentifier,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: variant.androidPackage,
  },
  extra: {
    appVariant: APP_VARIANT,
    bangleWebUrl: BANGLE_WEB_URL,
    ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
  },
};

export default config;
