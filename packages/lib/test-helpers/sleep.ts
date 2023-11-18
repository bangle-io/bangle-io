export const sleep = (ms = 1) =>
  new Promise((resolve) => setTimeout(resolve, ms));
