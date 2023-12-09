import { findAllExportedPaths } from '../find-all-exported-paths';

describe('findAllExportedPaths', () => {
  it('should handle named exports', () => {
    const sourceCode = `export { name1, name2 } from 'module-name';`;
    expect(findAllExportedPaths(sourceCode)).toEqual(['module-name']);
  });

  it('should handle namespace exports', () => {
    const sourceCode = `export * as name1 from 'module-name';`;
    expect(findAllExportedPaths(sourceCode)).toEqual(['module-name']);
  });

  it('should handle default re-exports', () => {
    const sourceCode = `export { default } from 'module-name';`;
    expect(findAllExportedPaths(sourceCode)).toEqual(['module-name']);
  });

  it('should handle multiple exports in one file', () => {
    const sourceCode = `
      export { name1 } from 'module1';
      export * from 'module2';
    `;
    expect(findAllExportedPaths(sourceCode)).toEqual(['module1', 'module2']);
  });

  it('should ignore duplicates', () => {
    const sourceCode = `
      export { name1 } from 'module';
      export { name2 } from 'module';
    `;
    expect(findAllExportedPaths(sourceCode)).toEqual(['module']);
  });

  it('should return an empty array for no exports', () => {
    const sourceCode = `const a = 10;`;
    expect(findAllExportedPaths(sourceCode)).toEqual([]);
  });

  it('should handle exports with double quotes', () => {
    const sourceCode = `export { name1 } from "module-name";`;
    expect(findAllExportedPaths(sourceCode)).toEqual(['module-name']);
  });

  it('should handle multiline exports', () => {
    const sourceCode = `
      export {
        name1,
        name2
      } from 'module-name';
    `;
    expect(findAllExportedPaths(sourceCode)).toEqual(['module-name']);
  });

  it('should handle exports without from clause', () => {
    const sourceCode = `
      const name1 = 'value1';
      export { name1 };
    `;
    expect(findAllExportedPaths(sourceCode)).toEqual([]);
  });

  it('should handle type exports', () => {
    const sourceCode = `export type { TypeName } from 'module-type';`;
    expect(findAllExportedPaths(sourceCode)).toEqual(['module-type']);
  });

  it('should handle interface exports', () => {
    const sourceCode = `export interface InterfaceName {}`;
    expect(findAllExportedPaths(sourceCode)).toEqual([]);
  });

  it('should handle type re-exports', () => {
    const sourceCode = `export { type TypeName } from 'module-type';`;
    expect(findAllExportedPaths(sourceCode)).toEqual(['module-type']);
  });

  it('should handle type *', () => {
    const sourceCode = `export type * from 'module-type';`;
    expect(findAllExportedPaths(sourceCode)).toEqual(['module-type']);
  });

  it('should handle type *', () => {
    const sourceCode = `
    export type * from 'module-type';
    export type * from 'module-type-b';
    `;
    expect(findAllExportedPaths(sourceCode)).toEqual([
      'module-type',
      'module-type-b',
    ]);
  });

  it('should handle mixed regular and type exports', () => {
    const sourceCode = `
      export { regularName } from 'module-regular';
      export type { TypeName } from 'module-type';
    `;
    expect(findAllExportedPaths(sourceCode)).toEqual([
      'module-regular',
      'module-type',
    ]);
  });

  it('should handle exports with type and value having the same name', () => {
    const sourceCode = `
      export { TypeName } from 'module-name';
      export type { TypeName as TypeAlias } from 'module-type';
    `;
    expect(findAllExportedPaths(sourceCode)).toEqual([
      'module-name',
      'module-type',
    ]);
  });

  it('should handle type exports without from clause', () => {
    const sourceCode = `export type TypeName = { key: string };`;
    expect(findAllExportedPaths(sourceCode)).toEqual([]);
  });
});

describe('findAllExportedPaths type exports', () => {
  it('should handle type exports', () => {
    const sourceCode = `export type { TypeName } from 'module-type';`;
    expect(findAllExportedPaths(sourceCode)).toEqual(['module-type']);
  });

  it('should handle interface exports', () => {
    const sourceCode = `export interface InterfaceName {}`;
    expect(findAllExportedPaths(sourceCode)).toEqual([]);
  });

  it('should handle type re-exports', () => {
    const sourceCode = `export { type TypeName } from 'module-type';`;
    expect(findAllExportedPaths(sourceCode)).toEqual(['module-type']);
  });

  it('should handle mixed regular and type exports', () => {
    const sourceCode = `
      export { regularName } from 'module-regular';
      export type { TypeName } from 'module-type';
    `;
    expect(findAllExportedPaths(sourceCode)).toEqual([
      'module-regular',
      'module-type',
    ]);
  });

  it('should handle exports with type and value having the same name', () => {
    const sourceCode = `
      export { TypeName } from 'module-name';
      export type { TypeName as TypeAlias } from 'module-type';
    `;
    expect(findAllExportedPaths(sourceCode)).toEqual([
      'module-name',
      'module-type',
    ]);
  });

  it('should handle type exports without from clause', () => {
    const sourceCode = `export type TypeName = { key: string };`;
    expect(findAllExportedPaths(sourceCode)).toEqual([]);
  });

  it('should handle multiline exports with non-export code in between', () => {
    const sourceCode = `
      export {
        name1,
        name2
      } from 'module1';
      const nonExported = 'example';
      export {
        name3
      } from 'module2';
    `;
    expect(findAllExportedPaths(sourceCode)).toEqual(['module1', 'module2']);
  });

  it('should handle mixed exports and imports in one file', () => {
    const sourceCode = `
      import { importedName } from 'imported-module';
      export { exportedName } from 'exported-module';
    `;
    expect(findAllExportedPaths(sourceCode)).toEqual(['exported-module']);
  });

  it('should handle multiple multiline exports', () => {
    const sourceCode = `
      export {
        name1,
        name2
      } from 'module1';
      export {
        name3,
        name4
      } from 'module2';
    `;
    expect(findAllExportedPaths(sourceCode)).toEqual(['module1', 'module2']);
  });

  it('should handle mixed multiline exports and type exports', () => {
    const sourceCode = `
      export type {
        TypeName1,
        TypeName2
      } from 'type-module';
      export {
        name1,
        name2
      } from 'value-module';
    `;
    expect(findAllExportedPaths(sourceCode)).toEqual([
      'type-module',
      'value-module',
    ]);
  });

  it('should handle exports interspersed with non-export code', () => {
    const sourceCode = `
      const value = 'example';
      export { name1 } from 'module1';
      function exampleFunction() {}
      export { name2 } from 'module2';
    `;
    expect(findAllExportedPaths(sourceCode)).toEqual(['module1', 'module2']);
  });
});
