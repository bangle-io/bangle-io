export function findAllImportedPackages(sourceCode: string): string[] {
  // Match static imports, dynamic imports, and CommonJS requires.
  const importRegex =
    /import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;

  let match: RegExpExecArray | null;
  const allPkg = new Set<string>();

  // Using a Set to avoid duplicate entries
  // biome-ignore lint/suspicious/noAssignInExpressions: needed for regex exec loop
  while ((match = importRegex.exec(sourceCode)) !== null) {
    // Adding the captured group which is not null to the set
    const importPath = match[1] ?? match[2] ?? match[3];
    if (importPath) {
      allPkg.add(importPath);
    }
  }

  return Array.from(allPkg);
}
