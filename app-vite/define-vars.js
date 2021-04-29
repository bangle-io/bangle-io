/* eslint-disable no-process-env */
module.exports = function (mode) {
  const isProduction = mode;
  let commitHash = require('child_process')
    .execSync('git rev-parse --short HEAD')
    .toString();

  if (isProduction && process.env.NODE_ENV !== 'production') {
    throw new Error('NODE_ENV not production');
  }

  return {
    'process.env.NODE_ENV': JSON.stringify(
      isProduction ? 'production' : 'development',
    ),
    'process.env.RELEASE_ID': JSON.stringify(
      process.env.NETLIFY
        ? `${process.env.CONTEXT}@` + process.env.COMMIT_REF
        : 'local@' + commitHash,
    ),
    'process.env.DEPLOY_ENV': JSON.stringify(
      process.env.NETLIFY ? process.env.CONTEXT : 'local',
    ),
  };
};
