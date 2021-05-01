// jest-puppeteer.config.js
module.exports = {
  server: [
    {
      command: 'yarn g:build-prod-serve',
      port: 1234,
      launchTimeout: 120 * 1000,
    },
  ],

  launch: {
    // slowMo: 100,
    headless: true,
  },

  // To run on chrome
  // /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --no-first-run --no-default-browser-check --user-data-dir=$(mktemp -d -t 'chrome-remote_data_dir')
  // connect: {
  //   browserWSEndpoint:
  //     'ws://127.0.0.1:9222/devtools/browser/e68e2bd6-cf73-477f-99c8-f0d6582333bb',
  // },
};
