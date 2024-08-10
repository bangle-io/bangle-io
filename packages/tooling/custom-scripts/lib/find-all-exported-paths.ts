export function findAllExportedPaths(sourceCode: string): string[] {
  // Updated regex to match type exports and re-exports as well
  const exportRegex =
    /export\s+(?:(?:\* as \w+|\*)\s+from\s+|{[^}]+}\s+from\s+|type\s+(?:\*|{[^}]+})\s+from\s+)?['"]([^'"]+)['"]/g;

  let match: RegExpExecArray | null;
  const allPaths = new Set<string>();

  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((match = exportRegex.exec(sourceCode)) !== null) {
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    allPaths.add(match[1]!);
  }

  return Array.from(allPaths);
}
