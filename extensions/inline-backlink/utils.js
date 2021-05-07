export function removeMdExtension(str) {
  if (str.endsWith('.md')) {
    return str.slice(0, -3);
  }
  return str;
}
