export function findAllExportedPaths(sourceCode: string): string[] {
  // Updated regex to match type exports and re-exports as well
  const exportRegex =
    /export\s+(?:(?:\* as \w+|\*)\s+from\s+|{[^}]+}\s+from\s+|type\s+(?:\*|{[^}]+})\s+from\s+)?['"]([^'"]+)['"]/g;

  let match;
  const allPaths = new Set<string>();

  while ((match = exportRegex.exec(sourceCode)) !== null) {
    allPaths.add(match[1]!);
  }

  return Array.from(allPaths);
}
