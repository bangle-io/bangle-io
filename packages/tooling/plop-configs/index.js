const path = require('node:path');
const execa = require('execa');

const workspaceNames = {
  jsLib: 'js-lib',
};

const _GENERATE_ALL = 'generate-all';

const rootDir = path.resolve(__dirname, '../../../');

const plopConfigPath = path.resolve(__dirname);

function addToWorkspaces(obj, packageName) {
  const workspaces = [...new Set(obj.workspaces || [])];
  workspaces.push(packageName);
  obj.workspaces = [...new Set(workspaces.sort())];

  return obj;
}

const commonSetup = (workspaceName) => {
  /** @type {import('plop').ActionType} */
  const addPackage = {
    type: 'add',
    path: path.join(
      rootDir,
      'packages',
      `${workspaceName}/{{name}}/package.json`,
    ),
    templateFile: path.join(plopConfigPath, 'templates/package-json.hbs'),
  };

  /** @type {import('plop').ActionType} */
  const addTest = {
    type: 'add',
    path: path.join(
      rootDir,
      'packages',
      `${workspaceName}/{{name}}/__tests__/{{name}}.test.ts`,
    ),
    templateFile: path.join(plopConfigPath, 'templates/test-ts.hbs'),
  };

  /** @type {Array<import('plop').PlopGeneratorConfig['prompts']>} */
  const prompts = [
    {
      type: 'input',
      name: 'name',
      message: 'package name please',
    },
    {
      type: 'list',
      name: 'packageEnv',
      choices: ['nodejs', 'universal', 'browser'],
    },
  ];
  return {
    prompts,
    actions: [addPackage, addTest],
  };
};

module.exports = function main(
  /** @type {import('plop').NodePlopAPI} */
  plop,
) {
  const _camelCase = (name) => {
    const [first, ...rest] = name.split('-');

    return [
      first,
      ...rest.map((word) => word.charAt(0).toUpperCase() + word.slice(1)),
    ].join('');
  };

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
    const word = sliceCamelName(text);

    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  // or do async things inside of an action
  plop.setActionType('runFormat', (_answers, _config, _plop) => {
    // execa('pnpm', ['-w', 'run', GENERATE_ALL], {
    //   cwd: rootDir,
    //   stdio: 'inherit',
    // }).then(() => {
    //   return 'runFormat done';
    // });
  });
  plop.setActionType('runPnpmInstall', (_answers, _config, _plop) =>
    execa('pnpm', ['-w', 'install'], {
      cwd: rootDir,
      stdio: 'inherit',
    }).then(() => {
      return 'runPnpmInstall done';
    }),
  );

  generateLib(plop);
  generateJSLib(plop);
};

function generateLib(plop) {
  const workspaceName = 'lib';
  const gens = commonSetup(workspaceName);

  plop.setGenerator(workspaceName, {
    description: `Create ${workspaceName} package`,
    prompts: [...gens.prompts],
    actions: [
      ...gens.actions,
      {
        type: 'add',
        path: path.join(
          rootDir,
          'packages',
          `${workspaceName}/{{name}}/index.ts`,
        ),
        templateFile: path.join(plopConfigPath, 'templates/index-ts.hbs'),
      },
      {
        type: 'runFormat',
      },
      {
        type: 'runPnpmInstall',
      },
    ],
  });
}

function generateJSLib(plop) {
  const workspaceName = workspaceNames.jsLib;
  const gens = commonSetup(workspaceName);

  plop.setGenerator(workspaceName, {
    description: `Create ${workspaceName} package`,
    prompts: [...gens.prompts],
    actions: [
      ...gens.actions,
      {
        type: 'add',
        path: path.join(
          rootDir,
          'packages',
          `${workspaceName}/{{name}}/index.ts`,
        ),
        templateFile: path.join(plopConfigPath, 'templates/index-ts.hbs'),
      },
      {
        type: 'runFormat',
      },
      {
        type: 'runPnpmInstall',
      },
    ],
  });
}
