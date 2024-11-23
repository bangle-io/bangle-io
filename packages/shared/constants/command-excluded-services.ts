import type { AllServiceName } from '@bangle.io/types';

export const commandExcludedServices = [
  'commandRegistry',
  'commandDispatcher',
] as const satisfies AllServiceName[];
