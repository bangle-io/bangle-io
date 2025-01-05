const globalConfig: { debug: boolean } = { debug: false };

export function setGlobalConfig(config: { debug?: boolean } = {}) {
  globalConfig.debug = config.debug ?? false;
}

export function getGlobalConfig() {
  return globalConfig;
}
