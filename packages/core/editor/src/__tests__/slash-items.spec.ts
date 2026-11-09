import { describe, expect, it } from 'vitest';
import { slashMenuFilter } from '../components/slash-items';

describe('slashMenuFilter', () => {
  it('ranks a canonical-id prefix highest', () => {
    expect(slashMenuFilter('date calendar', 'date')).toBe(1);
    expect(slashMenuFilter('heading-1 h1 title large', 'head')).toBe(1);
  });

  it('matches alias word prefixes below canonical prefixes', () => {
    expect(slashMenuFilter('heading-1 h1 title large', 'h1')).toBe(0.8);
    expect(slashMenuFilter('date calendar', 'cal')).toBe(0.8);
    // "heading-1" splits on the dash, so the number is a word too.
    expect(slashMenuFilter('heading-1 h1 title large', '1')).toBe(0.8);
  });

  it('matches plain substrings lowest', () => {
    expect(slashMenuFilter('numbered-list ordered ol', 'bere')).toBe(0.5);
  });

  it('rejects scattered fuzzy matches', () => {
    // cmdk's fuzzy scorer used to let "date" match "heading-1 h1 title
    // large" via scattered letters and outrank the Date item.
    expect(slashMenuFilter('heading-1 h1 title large', 'date')).toBe(0);
    expect(slashMenuFilter('bullet-list unordered ul', 'code')).toBe(0);
  });

  it('shows everything for an empty query', () => {
    expect(slashMenuFilter('anything at all', '')).toBe(1);
    expect(slashMenuFilter('anything at all', '   ')).toBe(1);
  });

  it('is case-insensitive', () => {
    expect(slashMenuFilter('date calendar', 'DATE')).toBe(1);
  });
});
