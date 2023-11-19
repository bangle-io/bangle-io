export const sleep = (ms = 5): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
