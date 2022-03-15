/* eslint-disable no-process-env */
process.env.HELP_DOCS_VERSION = '1.0.0';

process.on('unhandledRejection', (reason) => {
  console.log(reason); // log the reason including the stack trace
  throw new Error('unhandled error');
});

if (typeof DOMException === 'undefined') {
  // eslint-disable-next-line no-native-reassign
  global.DOMException = require('domexception');
}

console.debug = () => {};
