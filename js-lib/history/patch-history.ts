// Inspired from https://github.com/molefrog/wouter/blob/master/use-location.js

export const eventPopstate = 'popstate';
export const eventPushState = 'pushState';
export const eventReplaceState = 'replaceState';

export const historyEvents = [eventPopstate, eventPushState, eventReplaceState];

// While History API does have `popstate` event, the only
// proper way to listen to changes via `push/replaceState`
// is to monkey-patch these methods.
//
// See https://stackoverflow.com/a/4585031
if (typeof window !== 'undefined' && typeof window.history !== 'undefined') {
  const history: any = window.history;

  for (const type of [eventPushState, eventReplaceState]) {
    const original = history[type];

    history[type] = function () {
      const result = original.apply(this, arguments);
      const event = new Event(type);
      (event as any).arguments = arguments;

      dispatchEvent(event);

      return result;
    };
  }
}
