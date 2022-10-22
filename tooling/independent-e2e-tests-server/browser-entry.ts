import babyFs from './baby-fs';

let configs = [babyFs];

(function run() {
  // ...
  const pathname = window.location.pathname.slice(1);

  if (!pathname) {
    console.warn('No pathname provided');

    return;
  }

  const config = configs.find((config) => config.packageName === pathname);

  if (!config) {
    console.warn(`No config found for ${pathname}`);

    return;
  }

  config.setup();
})();
