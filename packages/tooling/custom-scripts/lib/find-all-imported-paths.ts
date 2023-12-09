export function findAllImportedPackages(sourceCode: string): string[] {
  // Regular expression to match standard and dynamic import statements
  const importRegex =
    /import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g;

  let match;
  const allPkg = new Set<string>();

  // Using a Set to avoid duplicate entries
  while ((match = importRegex.exec(sourceCode)) !== null) {
    // Adding the captured group which is not null to the set
    if (match[1]) {
      allPkg.add(match[1]);
    } else if (match[2]) {
      allPkg.add(match[2]);
    }
  }

  return Array.from(allPkg);
}
