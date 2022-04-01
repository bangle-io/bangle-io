function addToWorkspaces(obj, packageName) {
  const workspaces = [...new Set(obj.workspaces || [])];
  workspaces.push(packageName);
  obj.workspaces = workspaces.sort();

  return obj;
}
module.exports = function main(plop) {
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
