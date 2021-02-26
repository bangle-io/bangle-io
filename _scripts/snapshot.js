// script for snap-shitting the progress
const ts = require('date-fns/format')(
  new Date(),
  'MMM-dd-yy',
).toLocaleLowerCase();
require('child_process').execSync(
  `yarn dlx surge build bangle-${ts}.surge.sh`,
  { stdio: [0, 1, 2] },
);
