import cssVar from './css-vars';
import formatPackage from './format-package-json';

void main();

async function main() {
  await formatPackage();
  await cssVar();
}
