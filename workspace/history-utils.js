// shallow merges with the existing state and
// does a history.replace
export function replaceHistoryState(history, newState) {
  return history.replace({
    ...history.location,
    state: {
      ...history.location.state,
      ...newState,
    },
  });
}
