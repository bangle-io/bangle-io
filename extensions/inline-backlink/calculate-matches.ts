import type { EditorState } from '@bangle.dev/pm';
import { findChildrenByType } from '@bangle.dev/utils';
import { wikiLink } from '@bangle.dev/wiki-link';

import { weakCache, weakCacheDuo } from '@bangle.io/utils';
import {
  getExtension,
  hasValidNoteExtension,
  removeExtension,
  resolvePath,
} from '@bangle.io/ws-path';

export const getAllWikiLinks = weakCache((state: EditorState): string[] => {
  const wikiLinks = findChildrenByType(
    state.doc,
    state.schema.nodes[wikiLink.spec().name]!,
  );

  const result = wikiLinks
    .map((r) => r.node.attrs.path)
    .filter((r) => typeof r === 'string');

  return result;
});

const processWsPaths = weakCache((allWsPaths: string[]) => {
  allWsPaths = [...allWsPaths];

  const wsPathSet = new Set(allWsPaths);
  // sort by the least nested to most nested
  const sortedByNesting = allWsPaths.sort((a, b) => {
    return a.split('/').length - b.split('/').length;
  });

  const lowerCaseFileNameWithoutExt = new Set(
    allWsPaths.map((w) => {
      const { fileNameWithoutExt } = resolvePath(w, true);

      return fileNameWithoutExt.toLocaleLowerCase();
    }),
  );

  const filePathsWithoutExt = new Set(
    allWsPaths.map((w) => {
      const { filePath } = resolvePath(w, true);

      return removeExtension(filePath);
    }),
  );

  return {
    sortedByNesting,
    wsPathSet,
    filePathsWithoutExt,
    lowerCaseFileNameWithoutExt,
  };
});

/**
 * goes through all the wsPaths and returns a Map of wiki path
 * and its corresponding wsPath. The match only happens if the the fileName
 * matches with the wikiLink. It prefers a case sensitive match wherever it can
 *
 * Note:
 * - For perf reasons, it will cache based on the ref of `noteWsPaths` and `editorState`. So
 *   please be mindful of changing the reference to avoid redundant recomputing.
 *
 *
 * @param allWsPaths
 * @param wikiLinks
 * @returns
 */
export const calcWikiLinkMapping = weakCacheDuo(
  (noteWsPaths: string[], wikiLinks: string[]): Map<string, string> => {
    let result = new Map<string, string>();

    const matchWithFileName = (
      wsPath: string,
      wikiLink: string,
    ): string | undefined => {
      const wikiLinkExtension = getExtension(wikiLink);

      const { fileName, fileNameWithoutExt } = resolvePath(wsPath, true);

      // if wiki link has extension, we need to match with the extension
      if (wikiLinkExtension) {
        return fileName === wikiLink ? wsPath : undefined;
      } else {
        return fileNameWithoutExt === wikiLink ? wsPath : undefined;
      }
    };

    const processedAllWsPaths = processWsPaths(noteWsPaths);

    for (let wikiLink of wikiLinks) {
      const wikiLinkExtension = getExtension(wikiLink);

      if (wikiLink.startsWith('./') || wikiLink.startsWith('../')) {
        continue;
      }
      // if there is a `/` in the wikiLink, assume it is an absolute path _FOR NOW_
      // try to see if it matches with the wsPaths or else continue
      if (wikiLink.includes('/')) {
        const wikiLinkWithoutExt = removeExtension(wikiLink);

        if (processedAllWsPaths.filePathsWithoutExt.has(wikiLinkWithoutExt)) {
          let matchingWsPath: string | undefined;

          if (wikiLinkExtension) {
            matchingWsPath = processedAllWsPaths.sortedByNesting.find((w) => {
              const { filePath } = resolvePath(w, true);

              return filePath === wikiLink;
            });
          } else {
            matchingWsPath = processedAllWsPaths.sortedByNesting.find((w) => {
              const { filePath } = resolvePath(w, true);

              return removeExtension(filePath) === wikiLink;
            });
          }

          if (matchingWsPath) {
            result.set(wikiLink, matchingWsPath);
          }
        }

        continue;
      }

      const lowerCaseWikiLink = wikiLink.toLocaleLowerCase();

      // optimization: first check if it has a fileName that can possibly match
      if (
        processedAllWsPaths.lowerCaseFileNameWithoutExt.has(
          removeExtension(lowerCaseWikiLink),
        )
      ) {
        // donot deal with wikilinks with non-note extensions
        if (wikiLinkExtension && !hasValidNoteExtension(wikiLink)) {
          continue;
        }

        let exactMatch: string | undefined;
        let caseInsensitiveMatch: string | undefined;

        // we prefer the least nested wsPath in case of multiple matches
        for (const w of processedAllWsPaths.sortedByNesting) {
          if (exactMatch) {
            break;
          }

          exactMatch = matchWithFileName(w, wikiLink);

          if (!caseInsensitiveMatch) {
            caseInsensitiveMatch = matchWithFileName(
              w.toLocaleLowerCase(),
              lowerCaseWikiLink,
            );
          }
        }

        if (exactMatch) {
          result.set(wikiLink, exactMatch);
          continue;
        } else if (caseInsensitiveMatch) {
          result.set(wikiLink, caseInsensitiveMatch);
          continue;
        }
      }
    }

    return result;
  },
);
