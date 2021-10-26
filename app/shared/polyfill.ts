import { isWorkerGlobalScope } from '@bangle.io/naukar-worker';

const polyfills: Promise<any>[] = [];

// WARNING this will be executed in worker too
//  SO dont include polyfills that fill DOM

if (!isWorkerGlobalScope()) {
  window.requestIdleCallback =
    window.requestIdleCallback ||
    function (cb) {
      var start = Date.now();
      return setTimeout(function () {
        cb({
          didTimeout: false,
          timeRemaining: function () {
            return Math.max(0, 50 - (Date.now() - start));
          },
        });
      }, 1);
    };

  window.cancelIdleCallback =
    window.cancelIdleCallback ||
    function (id) {
      clearTimeout(id);
    };
}

export { polyfills };
