import { NativeBrowserFileSystem } from '@bangle.io/baby-fs';

import type { Config } from './common';

const config: Config = {
  packageName: '@bangle.io/baby-fs',
  setup,
};

export const babyFsInjected = { NativeBrowserFileSystem };
export type BabyFsInjected = typeof babyFsInjected;

function setup() {
  document.body.innerHTML = `<h1>hello-baby-fs</h1>`;
  (globalThis as any).injected = babyFsInjected;
}

export default config;
