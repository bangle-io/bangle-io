declare module '@bangle.io/env-vars' {
  export interface HtmlInjections {
    favicon: string;
    sentry: string;
    bangleHelpPreload: string;
    viteJsEntry: string;
    fathom: string;
    inlinedScripts: string;
  }

  export interface AppEnvs {
    'process.env.__BANGLE_BUILD_TIME_CONFIG__': string;
  }

  export interface BangleConfigOutput {
    helpDocsVersion: string;
    appEnv: string;
    hot: boolean;
    htmlInjections: HtmlInjections;
    appEnvs: AppEnvs;
  }

  interface DefaultExportOptions {
    isProduction?: boolean;
    isVite?: boolean;
    isStorybook?: boolean;
    helpDocsVersion: string;
    publicDirPath: string;
  }

  const _default: (options: DefaultExportOptions) => BangleConfigOutput;
  export default _default;
}
