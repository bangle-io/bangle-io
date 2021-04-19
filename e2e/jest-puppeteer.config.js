// jest-puppeteer.config.js
module.exports = {
  server: [
    {
      command: 'yarn g:build-prod-serve',
      port: 1234,
      launchTimeout: 60 * 1000,
    },
  ],
  launch: {
    headless: true,
  },

  // To run on chrome
  // /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --no-first-run --no-default-browser-check --user-data-dir=$(mktemp -d -t 'chrome-remote_data_dir')
  //   connect: {
  //     browserWSEndpoint:
  //       'ws://127.0.0.1:9222/devtools/browser/19193478-6c75-4ee5-80c3-9fc4bff4ab99',
  //   },
};
