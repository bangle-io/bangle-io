import { sleep as utilSleep } from './utility';

export async function exponentialBackoff(
  fn: (attempt: number) => boolean | Promise<boolean>,
  abort: AbortSignal,
  {
    maxTry = 8,
    multiplyFactor = 20,
    sleep = utilSleep,
  }: {
    maxTry?: number;
    multiplyFactor?: number;
    sleep?: typeof utilSleep;
  } = {},
): Promise<void> {
  for (let i = 0; i < maxTry; i++) {
    if (abort.aborted) {
      return;
    }
    const res = await fn(i + 1);

    if (res) {
      return;
    }
    if (abort.aborted) {
      return;
    }
    await sleep(Math.pow(2, i) * multiplyFactor);
  }
}
