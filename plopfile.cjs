function addToWorkspaces(obj, packageName) {
  const workspaces = [...new Set(obj.workspaces || [])];
  workspaces.push(packageName);
  obj.workspaces = [...new Set(workspaces.sort())];

  return obj;
}

module.exports = function main(
  /** @type {import('plop').NodePlopAPI} */
  plop,
) {
  const sliceCamelName = (name) => {
    const [first, second, ...remaining] = name.split('-');

    if (first !== 'slice') {
      throw new Error(`Expected first word to be 'slice', got ${first}`);
    }

    return [
      second,
      ...remaining.map((word) => word.charAt(0).toUpperCase() + word.slice(1)),
    ].join('');
  };

  plop.setHelper('sliceCamelName', sliceCamelName);
  plop.setHelper('slicePascalCase', (text) => {
    let word = sliceCamelName(text);

    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  // controller generator
  plop.setGenerator('js-lib', {
    description: 'Create js lib package',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'package name please',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'js-lib/{{name}}/package.json',
        templateFile: 'tooling/plop-templates/new-js-lib/package-json.hbs',
      },
      {
        type: 'add',
        path: 'js-lib/{{name}}/index.ts',
        templateFile: 'tooling/plop-templates/new-js-lib/index-ts.hbs',
      },
      {
        type: 'modify',
        path: 'js-lib/package.json',
        transform: (fileContents, data) => {
          return JSON.stringify(
            addToWorkspaces(JSON.parse(fileContents), data.name),
            null,
            2,
          );
        },
      },
    ],
  });

  plop.setGenerator('lib-slice', {
    description: 'Create a new slice in lib/ directory',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message:
          'name of the slice package name with the slice prefix, example "slice-core" for @bangle.io/slice-core',
      },
      {
        type: 'input',
        name: 'addToWindowSlices',
        message: 'will this run in window? (y/n)',
        default: 'y',
      },
      {
        type: 'input',
        name: 'addToWorkerSlices',
        message: 'will this run in worker? (y/n)',
        default: 'n',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'lib/{{name}}/package.json',
        templateFile: 'tooling/plop-templates/new-lib-slice/package-json.hbs',
      },
      {
        type: 'add',
        path: 'lib/{{name}}/index.ts',
        templateFile: 'tooling/plop-templates/new-lib-slice/index-ts.hbs',
      },
      {
        type: 'add',
        path: 'lib/{{name}}/common.ts',
        templateFile: 'tooling/plop-templates/new-lib-slice/common-ts.hbs',
      },
      {
        type: 'add',
        path: 'lib/{{name}}/{{name}}.ts',
        templateFile: 'tooling/plop-templates/new-lib-slice/slice-ts.hbs',
      },
      {
        type: 'add',
        path: 'lib/{{name}}/__tests__/{{name}}.test.ts',
        templateFile: 'tooling/plop-templates/new-lib-slice/slice-test-ts.hbs',
      },
      {
        type: 'add',
        path: 'lib/{{name}}/__tests__/action.test.ts',
        templateFile: 'tooling/plop-templates/new-lib-slice/action-test-ts.hbs',
      },
      {
        type: 'modify',
        path: 'lib/package.json',
        transform: (fileContents, data) => {
          return JSON.stringify(
            addToWorkspaces(JSON.parse(fileContents), data.name),
            null,
            2,
          );
        },
      },
      {
        type: 'modify',
        path: 'app/bangle-store/bangle-slices.ts',
        transform: (fileContents, data) => {
          if (data.addToWindowSlices === 'y') {
            fileContents = fileContents.replace(
              '// <-- PLOP INSERT SLICE IMPORT -->',
              `// <-- PLOP INSERT SLICE IMPORT -->
import { ${sliceCamelName(data.name)}Slice } from '@bangle.io/${data.name}';`,
            );
            fileContents = fileContents.replace(
              '// <-- PLOP INSERT SLICE -->',
              `${sliceCamelName(data.name)}Slice(),` +
                '\n' +
                `// <-- PLOP INSERT SLICE -->`,
            );
          }

          return fileContents;
        },
      },
      {
        type: 'modify',
        path: 'app/bangle-store/package.json',
        transform: (fileContents, data) => {
          if (data.addToWindowSlices === 'y') {
            let newData = JSON.parse(fileContents);
            newData.dependencies[`@bangle.io/${data.name}`] = 'workspace:*';

            return JSON.stringify(newData, null, 2);
          }

          return fileContents;
        },
      },

      {
        type: 'modify',
        path: 'worker/worker-naukar/store/naukar-slices.ts',
        transform: (fileContents, data) => {
          if (data.addToWorkerSlices === 'y') {
            fileContents = fileContents.replace(
              '// <-- PLOP INSERT SLICE IMPORT -->',
              `// <-- PLOP INSERT SLICE IMPORT -->
import { ${sliceCamelName(data.name)}Slice } from '@bangle.io/${data.name}';`,
            );
            fileContents = fileContents.replace(
              '// <-- PLOP INSERT SLICE -->',
              `${sliceCamelName(data.name)}Slice(),` +
                '\n' +
                `// <-- PLOP INSERT SLICE -->`,
            );
          }

          return fileContents;
        },
      },
      {
        type: 'modify',
        path: 'worker/worker-naukar/package.json',
        transform: (fileContents, data) => {
          if (data.addToWorkerSlices === 'y') {
            let newData = JSON.parse(fileContents);
            newData.dependencies[`@bangle.io/${data.name}`] = 'workspace:*';

            return JSON.stringify(newData, null, 2);
          }

          return fileContents;
        },
      },
    ],
  });

  plop.setGenerator('lib', {
    description: 'Create js lib package',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'package name please',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'lib/{{name}}/package.json',
        templateFile: 'tooling/plop-templates/new-js-lib/package-json.hbs',
      },
      {
        type: 'add',
        path: 'lib/{{name}}/index.ts',
        templateFile: 'tooling/plop-templates/new-js-lib/index-ts.hbs',
      },
      {
        type: 'modify',
        path: 'lib/package.json',
        transform: (fileContents, data) => {
          return JSON.stringify(
            addToWorkspaces(JSON.parse(fileContents), data.name),
            null,
            2,
          );
        },
      },
    ],
  });

  plop.setGenerator('tooling', {
    description: 'Create tooling package',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'package name please',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'tooling/{{name}}/package.json',
        templateFile: 'tooling/plop-templates/new-js-lib/package-json.hbs',
      },
      {
        type: 'add',
        path: 'tooling/{{name}}/index.ts',
        templateFile: 'tooling/plop-templates/new-js-lib/index-ts.hbs',
      },
      {
        type: 'modify',
        path: 'tooling/package.json',
        transform: (fileContents, data) => {
          return JSON.stringify(
            addToWorkspaces(JSON.parse(fileContents), data.name),
            null,
            2,
          );
        },
      },
    ],
  });
};
