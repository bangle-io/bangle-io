const prettier = require('prettier');

function sleep(t = 10) {
  return new Promise((res) => setTimeout(res, t));
}

function longSleep(t = 50) {
  return new Promise((res) => setTimeout(res, t));
}

function frmtHTML(doc) {
  return prettier.format(doc, {
    semi: false,
    parser: 'html',
    printWidth: 36,
    singleQuote: true,
  });
}

module.exports = { sleep, longSleep, frmtHTML };
