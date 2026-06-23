import GithubSlugger from 'github-slugger';

/** Returns the heading index matching a GitHub-style Markdown anchor. */
export function findHeadingIndexBySlug(
  headings: readonly string[],
  fragment: string,
): number | undefined {
  const slugger = new GithubSlugger();
  const index = headings.findIndex(
    (heading) => slugger.slug(heading) === fragment,
  );
  return index < 0 ? undefined : index;
}
