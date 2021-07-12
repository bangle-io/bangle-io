import { isWorkerGlobalScope } from 'naukar-worker';

const polyfills = [];

// WARNING this will be executed in worker too
//  SO dont include polyfills that fill DOM
if (!String.prototype.matchAll) {
  polyfills.push(import('core-js/es/string/match-all'));
}

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
