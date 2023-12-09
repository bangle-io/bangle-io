import { findAllImportedPackages } from '../find-all-imported-paths';

describe('findAllImportedPackages', () => {
  it('should handle default imports', () => {
    const sourceCode = `import React from 'react';`;
    expect(findAllImportedPackages(sourceCode)).toEqual(['react']);
  });

  it('should handle named imports', () => {
    const sourceCode = `import { useState } from 'react';`;
    expect(findAllImportedPackages(sourceCode)).toEqual(['react']);
  });

  it('should handle namespace imports', () => {
    const sourceCode = `import * as React from 'react';`;
    expect(findAllImportedPackages(sourceCode)).toEqual(['react']);
  });

  it('should handle side-effect imports', () => {
    const sourceCode = `import 'reflect-metadata';`;
    expect(findAllImportedPackages(sourceCode)).toEqual(['reflect-metadata']);
  });

  it('should handle multiple imports in one file', () => {
    const sourceCode = `
        import React from 'react';
        import { render } from 'react-dom';
        import 'reflect-metadata';
      `;
    expect(findAllImportedPackages(sourceCode)).toEqual([
      'react',
      'react-dom',
      'reflect-metadata',
    ]);
  });

  it('should handle mixed types of imports', () => {
    const sourceCode = `
        import React, { useState } from 'react';
        import * as ReactDOM from 'react-dom';
        import 'some-polyfill';
      `;
    expect(findAllImportedPackages(sourceCode)).toEqual([
      'react',
      'react-dom',
      'some-polyfill',
    ]);
  });

  it('should handle multiline imports', () => {
    const sourceCode = `
      import {
        BrowserRouter as Router,
        Switch,
        Route,
        Link
      } from 'react-router-dom';
      import {
        useState,
        useEffect
      } from 'react';
    `;
    expect(findAllImportedPackages(sourceCode)).toEqual([
      'react-router-dom',
      'react',
    ]);
  });

  it('should handle dynamic imports', () => {
    const sourceCode = `const module = await import('module-name');`;
    expect(findAllImportedPackages(sourceCode)).toEqual(['module-name']);
  });

  it('should return an empty array for no imports', () => {
    const sourceCode = `const a = 10;`;
    expect(findAllImportedPackages(sourceCode)).toEqual([]);
  });

  it('should handle imports with double quotes', () => {
    const sourceCode = `import React from "react";`;
    expect(findAllImportedPackages(sourceCode)).toEqual(['react']);
  });

  it('should handle type imports', () => {
    const sourceCode = `import type { React } from "react";`;
    expect(findAllImportedPackages(sourceCode)).toEqual(['react']);
  });

  it('should ignore duplicates', () => {
    const sourceCode = `
        import React from 'react';
        import { useState } from 'react';
      `;
    expect(findAllImportedPackages(sourceCode)).toEqual(['react']);
  });

  it.skip('should handle imports within comments', () => {
    const sourceCode = `
      // import { mock } from 'mock-package';
      import React from 'react';
    `;
    expect(findAllImportedPackages(sourceCode)).toEqual(['react']);
  });
});
