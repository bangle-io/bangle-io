import type {
  AllServiceName,
  CommandHandlerContext,
  CommandKey,
} from '@bangle.io/types';

export const commandExcludedServices = [
  'commandRegistry',
  'commandDispatcher',
] as const satisfies AllServiceName[];

export const commandKeyToContext: WeakMap<
  CommandKey<string>,
  { context: CommandHandlerContext }
> = new WeakMap();
