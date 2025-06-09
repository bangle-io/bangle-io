export function findAllExportedPaths(sourceCode: string): string[] {
  // Updated regex to match type exports and re-exports as well
  const exportRegex =
    /export\s+(?:(?:\* as \w+|\*)\s+from\s+|{[^}]+}\s+from\s+|type\s+(?:\*|{[^}]+})\s+from\s+)?['"]([^'"]+)['"]/g;

  let match: RegExpExecArray | null;
  const allPaths = new Set<string>();

  // biome-ignore lint/suspicious/noAssignInExpressions: needed for regex exec loop
  while ((match = exportRegex.exec(sourceCode)) !== null) {
    const path = match[1];
    if (path) {
      allPaths.add(path);
    }
  }

  return Array.from(allPaths);
}
