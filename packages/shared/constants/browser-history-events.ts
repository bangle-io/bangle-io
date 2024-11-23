const browserHistoryPopstate = 'popstate';
const browserHistoryPushState = 'pushState';
const browserHistoryReplaceState = 'replaceState';
const browserHistoryHashchange = 'hashchange';
/**
 * History API docs @see https://developer.mozilla.org/en-US/docs/Web/API/History
 */
export const browserHistoryStateEvents = [
  browserHistoryPopstate,
  browserHistoryPushState,
  browserHistoryReplaceState,
  browserHistoryHashchange,
] as const;
