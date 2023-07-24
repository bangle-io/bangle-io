import { yarnGetVirtuals } from './yarn-helpers';

export function checkMultipleInstances() {
  const output = yarnGetVirtuals().filter(
    (r) =>
      r.value.startsWith('@bangle.io/') ||
      r.value.startsWith('@bangle.dev/') ||
      r.value.startsWith('prosemirror-') ||
      r.value.startsWith('react-router-dom@') ||
      r.value.startsWith('react@') ||
      r.value.startsWith('react-dom@'),
  );

  const faultyDeps = output
    .filter((r) => r.children.Instances > 1)
    // ignore app-entry as some tooling projects use it
    .filter((r) => !r.value.includes('@bangle.io/app-entry@workspace'));

  if (faultyDeps.length > 0) {
    console.log('\nPackages with more than one instances');
    console.log(
      faultyDeps
        .map((r) => `  name=${r.value} count=${r.children.Instances}`)
        .join('\n'),
    );
    console.log('\n');
    throw new Error(
      'One or more packages have multiple instances. Please read CONTRIBUTING.md for more info',
    );
  } else {
    console.log('checkMultipleInstances: found no issues');
  }
}
