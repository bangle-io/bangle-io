const fs = require('fs/promises');
const path = require('path');
const { walkWorkspace } = require('./map-files');

async function main() {
  const workspaces = await walkWorkspace();
}

main();
