import { Plugin } from 'vite';
import { IdentifierOption, CompileOptions } from '@vanilla-extract/integration';

interface Options {
    identifiers?: IdentifierOption;
    esbuildOptions?: CompileOptions['esbuildOptions'];
}
declare function vanillaExtractPlugin({ identifiers, esbuildOptions, }?: Options): Plugin;

export { vanillaExtractPlugin };
