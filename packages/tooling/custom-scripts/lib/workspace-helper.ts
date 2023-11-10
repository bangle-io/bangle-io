import fsProm from 'node:fs/promises';
import path from 'node:path';

import {
  BanglePackageConfig,
  banglePackageConfigSchema,
  BangleWorkspaceConfig,
  bangleWorkspaceConfigSchema,
} from './constants';

const root = path.resolve(__dirname, '../../../..');

type WorkspaceData = {
  name: string;
  path: string;
  packageJSON: Record<string, any>;
  bangleWorkspaceConfig: BangleWorkspaceConfig;
};

export class Workspace {
  get name() {
    return this.data.name;
  }

  get path() {
    return this.data.path;
  }

  private _packagesName: string[] = [];

  get packagesName(): readonly string[] {
    return this._packagesName;
  }

  get packageJSON() {
    return this.data.packageJSON;
  }

  get bangleWorkspaceConfig() {
    return this.data.bangleWorkspaceConfig;
  }

  allowedWsDependency(workspaces: Workspace[], packageName: string): boolean {
    if (this.bangleWorkspaceConfig.allowedWorkspaces.includes('*')) {
      return true;
    }

    for (const wsName of this.bangleWorkspaceConfig.allowedWorkspaces) {
      const wsMatch = workspaces.find((ws) => ws.name === wsName);

      if (!wsMatch) {
        throw new Error(
          `Could not find workspace ${wsName} in workspace ${this.name}`,
        );
      }

      if (wsMatch.packagesName.includes(packageName)) {
        return true;
      }
    }

    return false;
  }

  addPackageName(packageName: string) {
    this._packagesName.push(packageName);
  }

  constructor(private data: WorkspaceData) {}
}

interface PackageState {
  location: string;
  packageJSON: PackageJSON;
  files: string[];
  workspace: Workspace;
  banglePackageConfig: BanglePackageConfig;
}

interface PackageJSON {
  name: string;
  version: string;
  scripts?: Record<string, string>;
  repository?: Record<string, any>;
  author?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  description?: string;
  bangleWorkspaceConfig?: BangleWorkspaceConfig;
  banglePackageConfig?: BanglePackageConfig;
}

const globbyIgnore = ['**/node_modules/**', '**/dist/**', '**/build/**'];

export async function setup() {
  const { globbySync } = await import('globby');
  let packages = globbySync('**/package.json', {
    cwd: path.join(root, 'packages'),
    absolute: true,
    gitignore: true,
    ignore: globbyIgnore,
  });

  let packagesResolved = packages.map((p) => ({
    path: p,
    packageJSON: require(p),
  }));

  const workspaces: Record<string, Workspace> = Object.fromEntries(
    packagesResolved
      .filter((p) => p.packageJSON.bangleWorkspaceConfig)
      .map((p): [string, Workspace] => {
        const config = p.packageJSON.bangleWorkspaceConfig;

        // validate config
        bangleWorkspaceConfigSchema.parse(config);

        return [
          p.packageJSON.name,
          new Workspace({
            name: p.packageJSON.name,
            path: p.path,
            packageJSON: p.packageJSON,
            bangleWorkspaceConfig: p.packageJSON.bangleWorkspaceConfig,
          }),
        ];
      }),
  );

  const packageStateMap = Object.fromEntries(
    packagesResolved
      .filter(
        (p) =>
          !p.packageJSON.bangleWorkspaceConfig &&
          p.packageJSON.name !== 'bangle-io',
      )
      .map((p): [string, PackageState] => {
        const parentDir = path.basename(
          path.dirname(path.resolve(p.path, '..')),
        );

        const workspace = workspaces[parentDir];

        if (!workspace) {
          throw new Error(
            `Could not find workspace for "${p.packageJSON.name}" in "${parentDir}"`,
          );
        }
        workspace.addPackageName(p.packageJSON.name);

        const banglePackageConfig = p.packageJSON.banglePackageConfig;

        try {
          banglePackageConfigSchema.parse(banglePackageConfig);
        } catch (err) {
          console.error(err);
          throw new Error(
            `Validation error in package ${p.packageJSON.name} at ${p.path}`,
          );
        }

        const packageObj: PackageState = {
          location: path.dirname(p.path),
          workspace: workspace,
          packageJSON: p.packageJSON,
          banglePackageConfig: banglePackageConfig,
          files: globbySync('**/*', {
            cwd: path.dirname(p.path),
            gitignore: true,
            absolute: true,
            ignore: globbyIgnore,
          }),
        };

        return [p.packageJSON.name, packageObj];
      }),
  );

  const packagesMap = new Map<string, Package>();

  for (const [name, pkg] of Object.entries(packageStateMap)) {
    new Package(pkg, packagesMap);
  }

  return {
    packagesMap,
    workspaces,
  };
}

export class Package {
  packageJSON: PackageJSON;
  name: string;

  get type() {
    return this.banglePackageConfig.type;
  }

  get workspaceDependencies(): Record<string, Package> {
    return this._getWsDeps('dependencies');
  }

  get workspaceDevDependencies(): Record<string, Package> {
    return this._getWsDeps('devDependencies');
  }

  private fileHelpers: Map<string, FileHelper>;

  get banglePackageConfig() {
    return this.packageState.banglePackageConfig;
  }

  packagePath: string;

  get packageJSONPath() {
    return path.join(this.packagePath, 'package.json');
  }

  get workspace(): Workspace {
    return this.packageState.workspace;
  }

  constructor(
    private packageState: PackageState,
    private packageMapping: Map<string, Package>,
  ) {
    if (packageState.packageJSON.bangleWorkspaceConfig) {
      throw new Error(
        `Not allowed: Package ${packageState.packageJSON.name} is a workspace`,
      );
    }

    this.name = packageState.packageJSON.name;

    packageMapping.set(this.name, this);

    this.packagePath = packageState.location;

    this.packageJSON = packageState.packageJSON;

    this.fileHelpers = new Map<string, FileHelper>();

    for (const file of packageState.files) {
      this.fileHelpers.set(file, new FileHelper(file));
    }
  }

  private _getWsDeps(type: 'dependencies' | 'devDependencies') {
    return Object.fromEntries(
      Object.entries(this.packageJSON[type] ?? {})
        .filter(([name, value]) => value === 'workspace:*')
        .map(([name]): [string, Package] => {
          const pkg = this.packageMapping.get(name);

          if (!pkg) {
            throw new Error(`Could not find workspace ${name}`);
          }

          return [name, pkg];
        }),
    );
  }

  get dependencies() {
    return this.packageJSON.dependencies ?? {};
  }

  get devDependencies() {
    return this.packageJSON.devDependencies;
  }

  async forEachFile(
    cb: (opts: {
      filePath: string;
      content: string;
      pkg: Package;
      fileHelper: FileHelper;
    }) => void | Promise<void>,
    filter: (fileHelper: FileHelper) => boolean | Promise<boolean> = () => true,
  ) {
    await this.modifyFiles(async (opts) => {
      await cb(opts);

      return opts.content;
    }, filter);
  }

  getAllFilePaths(): string[] {
    return this.packageState.files;
  }

  /**
   *
   * @returns true if pkg has one or more css files
   */
  getCssFileNames(): string[] {
    return this.getAllFilePaths()
      .map((filePath) => (filePath.endsWith('.css') ? filePath : undefined))
      .filter((r): r is string => Boolean(r));
  }

  getFileHelper(fileName: string) {
    return this.fileHelpers.get(fileName);
  }

  /**
   *
   * @returns true if pkg has one or more css files
   */
  hasCSSFiles(): boolean {
    return this.getCssFileNames().length > 0;
  }

  async modifyFiles(
    cb: (opts: {
      filePath: string;
      content: string;
      pkg: Package;
      fileHelper: FileHelper;
    }) => string | Promise<string>,
    filter: (fileHelper: FileHelper) => boolean | Promise<boolean> = () => true,
  ) {
    for (const [filePath, fileHelper] of this.fileHelpers.entries()) {
      if (!(await filter(fileHelper))) {
        continue;
      }

      const result = await fileHelper.modify((content) =>
        cb({ filePath, content, pkg: this, fileHelper }),
      );

      this.fileHelpers.set(filePath, result);
    }
  }

  async getImportedPackages(
    filter: (fileHelper: FileHelper) => Promise<boolean> | boolean = () => true,
  ) {
    const importedPackages = new Set<string>();

    await this.forEachFile(
      async ({ content }) => {
        for (const importPath of extractImportPaths(content)) {
          if (importPath.startsWith('.')) {
            continue;
          }

          if (importPath.startsWith('@')) {
            const [scope, pkg] = importPath.split('/');
            importedPackages.add([scope, pkg].join('/'));
          } else {
            importedPackages.add(importPath.split('/')[0]!);
          }
        }
      },
      (file) => file.isTSFile && filter(file),
    );

    return [...importedPackages];
  }

  async modifyPackageJSON(
    cb: (pkgJSON: PackageJSON, pkg: Package) => PackageJSON,
  ): Promise<Package> {
    const newJSON = cb(this.packageJSON, this);

    if (JSON.stringify(newJSON) === JSON.stringify(this.packageJSON)) {
      return this;
    }

    await fsProm.writeFile(
      path.join(this.packagePath + '/package.json'),
      JSON.stringify(newJSON, null, 2) + '\n',
      'utf-8',
    );

    return new Package(
      {
        ...this.packageState,
        packageJSON: newJSON,
      },
      this.packageMapping,
    );
  }

  async toJSON() {
    return {
      name: this.name,
      packageJSON: this.packageJSON,
      packagePath: this.packagePath,
      workspaceDependencies: Object.keys(this.workspaceDependencies),
      workspaceDevDependencies: Object.keys(this.workspaceDevDependencies),
    };
  }
}

class FileHelper {
  contentCache: string | undefined;

  constructor(public filePath: string) {}

  get isCSSFile() {
    return this.filePath.endsWith('.css');
  }

  get isJSFile() {
    return this.filePath.endsWith('.js') || this.filePath.endsWith('.jsx');
  }

  get isJSONFile() {
    return this.filePath.endsWith('.json');
  }

  get isSrcFile() {
    return !this.isTestFile && !this.isStoryBookFile;
  }

  get isTestFile() {
    return this.filePath.includes('__tests__');
  }

  get isStoryBookFile() {
    return this.filePath.includes('.stories.');
  }

  get isTSFile() {
    return this.filePath.endsWith('.ts') || this.filePath.endsWith('.tsx');
  }

  get isUnitTestFile() {
    return this.filePath.includes('.test.');
  }

  async hasText(match: string | RegExp) {
    const content = await this.readCached();

    return match instanceof RegExp
      ? match.test(content)
      : content.includes(match);
  }

  async modify(cb: (content: string) => string | Promise<string>) {
    const content = await this.read();

    // skip files that have this comment
    if (content.includes('// @bangle-ignore-checks')) {
      return this;
    }

    const newContent = await cb(content);

    if (content !== newContent) {
      await fsProm.writeFile(this.filePath, newContent, 'utf-8');

      return new FileHelper(this.filePath);
    }

    return this;
  }

  async read() {
    const res = await fsProm.readFile(this.filePath, 'utf-8');

    this.contentCache = res;

    return res;
  }

  async readCached() {
    if (!this.contentCache) {
      return this.read();
    }

    return this.contentCache;
  }
}

function extractImportPaths(sourceCode: string): string[] {
  // Regular expression with named capturing group 'path' to match only the paths from ESM import statements
  const importRegex = /from\s*["'](?<path>[^"']+)["'];/gi;

  let match;
  const paths: string[] = [];

  // While we find matches in the source code, extract the path using the named group and add it to the paths array
  while ((match = importRegex.exec(sourceCode)) !== null) {
    if (match.groups?.path) {
      paths.push(match.groups.path);
    }
  }

  return paths;
}
