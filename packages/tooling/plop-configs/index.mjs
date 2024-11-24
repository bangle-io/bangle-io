import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import fs from 'fs-extra';
const topLevelWorkspaces = [
  'js-lib',
  //
  'ui',
  'shared',
  //
  'platform',
  'core',
  //
  'tooling',
];
const kind = [
  'library',
  'js-util',
  // all things that are static and have limited dep: configs, constants
  'static',
  'types',
  'build',
  'app',
  'service-platform',
  'service-core',
  'service-ui',
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../../');
const plopConfigPath = path.resolve(__dirname);

export default function main(plop) {
  plop.setGenerator('package', {
    description: 'Create a new package',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Package name please',
      },
      {
        type: 'list',
        name: 'workspace',
        message: 'Select the top level workspace',
        choices: topLevelWorkspaces,
      },
      {
        type: 'list',
        name: 'packageEnv',
        message: 'Select the package environment',
        choices: ['nodejs', 'browser', 'universal'],
        default: 'universal',
      },
      {
        type: 'list',
        name: 'kind',
        message: 'Package kind',
        default: 'library',
        choices: kind,
      },
    ],
    actions: (data) => {
      const workspaceName = data.workspace;
      const workspaceTemplatePath = path.join(
        plopConfigPath,
        'templates',
        workspaceName,
      );
      const defaultTemplatePath = path.join(
        plopConfigPath,
        'templates',
        'default',
      );
      const templatePath = fs.existsSync(workspaceTemplatePath)
        ? workspaceTemplatePath
        : defaultTemplatePath;
      const packagePath = path.join(
        rootDir,
        'packages',
        workspaceName,
        data.name,
      );

      return [
        {
          type: 'add',
          path: path.join(packagePath, 'package.json'),
          templateFile: path.join(templatePath, 'package-json.hbs'),
        },
        {
          type: 'add',
          path: path.join(
            packagePath,
            'src',
            '__tests__',
            `${data.name}.spec.ts`,
          ),
          templateFile: path.join(templatePath, 'test-ts.hbs'),
        },
        {
          type: 'add',
          path: path.join(packagePath, 'src', 'index.ts'),
          templateFile: path.join(templatePath, 'index-ts.hbs'),
        },
        {
          type: 'runFormat',
        },
        {
          type: 'runPnpmInstall',
        },
      ];
    },
  });

  plop.setActionType('runFormat', (_answers, _config, _plop) =>
    execa('pnpm', ['-w', 'run', 'custom-format'], {
      cwd: rootDir,
      stdio: 'inherit',
    }).then(() => {
      return 'Formatting complete';
    }),
  );

  plop.setActionType('runPnpmInstall', (_answers, _config, _plop) =>
    execa('pnpm', ['-w', 'install'], {
      cwd: rootDir,
      stdio: 'inherit',
    }).then(() => {
      return 'Dependencies installed';
    }),
  );
}
