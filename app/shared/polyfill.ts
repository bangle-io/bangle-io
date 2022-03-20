import { isWorkerGlobalScope } from '@bangle.io/utils';

const polyfills: Array<Promise<any>> = [];

// WARNING this will be executed in worker too
//  SO dont include polyfills that fill DOM

if (!isWorkerGlobalScope()) {
  if (typeof window !== 'undefined' && !window.requestIdleCallback) {
    console.debug('polyfilling idle callback');
    window.requestIdleCallback = function (cb, options) {
      var start = Date.now();

      return setTimeout(
        function () {
          cb({
            didTimeout: false,
            timeRemaining: function () {
              return Math.max(0, 50 - (Date.now() - start));
            },
          });
        },
        typeof options?.timeout === 'number' ? options.timeout : 50,
      ) as any;
    };
    window.cancelIdleCallback = function (id) {
      clearTimeout(id);
    };
  }
}

export { polyfills };
