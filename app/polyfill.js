const polyfills = [];

// WARNING this will be executed in worker too
//  SO dont include polyfills that fill DOM
if (!String.prototype.matchAll) {
  polyfills.push(import('core-js/es/string/match-all'));
}

export { polyfills };
