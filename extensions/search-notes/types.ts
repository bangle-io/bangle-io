// An array of string where every even item is a match.
// NOTE: it can have empty strings.
// for example ['aa', 'bb', 'cc'] , here 'bb' will be highlight in the search context
type highlightText = Array<string>;

export interface SearchResultItem {
  wsPath: string;
  matches: Array<{ parent: string; match: highlightText }>;
}
