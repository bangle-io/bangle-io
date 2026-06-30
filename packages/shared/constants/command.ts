import type {
  CommandExcludedServiceSlotId,
  CommandHandlerContext,
  CommandKey,
} from '@bangle.io/types';

export const commandExcludedServices = [
  'commandRegistry',
  'commandDispatcher',
] as const satisfies CommandExcludedServiceSlotId[];

export const commandKeyToContext: WeakMap<
  CommandKey<string>,
  { context: CommandHandlerContext }
> = new WeakMap();
