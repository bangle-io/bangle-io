// jest-puppeteer.config.js
module.exports = {
  server: [
    {
      command: 'yarn g:build-prod-serve',
      // command: 'sleep 100000',
      port: 1234,
      launchTimeout: 120 * 1000,
    },
  ],

  launch: {
    // slowMo: 550,
    // headless: false,
  },

  // To run on chrome
  // /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --no-first-run --no-default-browser-check --user-data-dir=$(mktemp -d -t 'chrome-remote_data_dir')
  // connect: {
  //   browserWSEndpoint:
  //     'ws://127.0.0.1:9222/devtools/browser/9a854614-685b-4738-a1db-3834e7bc5bb3',
  // },
};
