import type { EditorState } from '@bangle.dev/pm';
import { findChildrenByType } from '@bangle.dev/utils';
import { wikiLink } from '@bangle.dev/wiki-link';

import { weakCache, weakCacheDuo } from '@bangle.io/mini-js-utils';
import type { WsPath } from '@bangle.io/shared-types';
import {
  createWsPath,
  getExtension,
  removeExtension,
  resolvePath,
  VALID_NOTE_EXTENSIONS,
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

const processWsPaths = weakCache((_allWsPaths: readonly WsPath[]) => {
  let allWsPaths: WsPath[] = [..._allWsPaths];

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
  (
    noteWsPaths: readonly WsPath[],
    wikiLinks: string[],
  ): Map<string, WsPath> => {
    let result = new Map<string, WsPath>();
    const matchWithFileName = (
      wsPath: WsPath,
      wikiLink: string,
    ): WsPath | undefined => {
      const wikiLinkExtension = getExtension(wikiLink);

      const { fileName, fileNameWithoutExt } = resolvePath(wsPath, true);

      // if wiki link has extension, we need to match with the extension
      if (wikiLinkExtension) {
        if (fileName === wikiLink) {
          return wsPath;
        }

        // try out a bunch of valid note extensions to see if we can match
        // to handle cases when file name is bangle.io.md
        for (const withNotExt of VALID_NOTE_EXTENSIONS) {
          if (fileName === wikiLink + withNotExt) {
            return wsPath;
          }
        }

        return undefined;
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
          let matchingWsPath: WsPath | undefined;

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

        if (wikiLink.startsWith('/')) {
          const withoutSlash = wikiLink.slice(1);
          let withoutSlashAndExt = removeExtension(withoutSlash);

          if (processedAllWsPaths.filePathsWithoutExt.has(withoutSlashAndExt)) {
            let match = processedAllWsPaths.sortedByNesting.find((w) => {
              const { filePath } = resolvePath(w, true);

              return filePath === withoutSlash;
            });

            if (match) {
              result.set(wikiLink, match);
            }
          }
        }
        continue;
      }

      const lowerCaseWikiLink = wikiLink.toLocaleLowerCase();

      // optimization: first check if it has a fileName that can possibly match
      if (
        processedAllWsPaths.lowerCaseFileNameWithoutExt.has(
          removeExtension(lowerCaseWikiLink),
        ) ||
        // for cases where file name has a dot example bangle.io.md
        processedAllWsPaths.lowerCaseFileNameWithoutExt.has(lowerCaseWikiLink)
      ) {
        let exactMatch: WsPath | undefined;
        let caseInsensitiveMatch: WsPath | undefined;

        // we prefer the least nested wsPath in case of multiple matches
        for (const wsPath of processedAllWsPaths.sortedByNesting) {
          // if there is an exact match, we prefer that and we break
          // out of the loop
          if (exactMatch) {
            break;
          }

          exactMatch = matchWithFileName(wsPath, wikiLink);

          // insensitive match is of a lower priority and it doesn't break
          // the loop, just in case there is an exact match later
          if (
            !caseInsensitiveMatch &&
            matchWithFileName(
              createWsPath(wsPath.toLocaleLowerCase()),
              lowerCaseWikiLink,
            )
          ) {
            caseInsensitiveMatch = wsPath;
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
