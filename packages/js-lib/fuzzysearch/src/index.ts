// https://github.com/bevacqua/fuzzysearch/blob/master/index.js
export function fuzzySearch(needle: string, haystack: string): boolean {
  const nlen = needle.length;
  const hlen = haystack.length;

  if (nlen === 0) {
    return true;
  }
  if (nlen > hlen) {
    return false;
  }
  if (nlen === hlen) {
    return needle.toLowerCase() === haystack.toLowerCase();
  }

  let i = 0; // Index for needle
  let j = 0; // Index for haystack

  const needleLower = needle.toLowerCase();
  const haystackLower = haystack.toLowerCase();

  while (i < nlen && j < hlen) {
    if (needleLower[i] === haystackLower[j]) {
      i++;
    }
    j++;
  }

  return i === nlen;
}
