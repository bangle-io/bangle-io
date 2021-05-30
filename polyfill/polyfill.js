const polyfills = [];

if (!String.prototype.matchAll) {
  polyfills.push(import('core-js/es/string/match-all'));
}

export { polyfills };
