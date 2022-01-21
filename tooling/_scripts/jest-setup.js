/* eslint-disable no-process-env */

process.env.HELP_DOCS_VERSION = '1.0.0';

if (typeof DOMException === 'undefined') {
  // eslint-disable-next-line no-native-reassign
  global.DOMException = require('domexception');
}
