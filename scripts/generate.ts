import { parserPackages, repositoryRoot } from './parser-packages.ts';
process.argv.splice(2,Infinity,...parserPackages.map(name=>`${repositoryRoot}packages/${name}/src/schema.ts`));
await import('../packages/compiler/src/cli.ts');
