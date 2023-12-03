export function cx(...args: any[]): string {
  let classes = '';
  for (const arg of args) {
    if (!arg) {
      continue;
    }
    classes += arg + ' ';
  }

  return classes;
}
