export function createEmptyArray(size: number) {
  return Array.from({ length: size }, () => {
    return undefined;
  });
}
