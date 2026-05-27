import test from 'node:test';
import { strict as assert } from 'node:assert';
import { render } from '../src/index.ts';

// 50-line representative YAML-block input. Contains:
//   - Flat scalar entries (name, version, etc.)
//   - Nested sequence values (authors, dependencies, etc.)
//   - Nested mapping values (config, endpoints, constants)
//   - Mixed nesting levels
//
// Note: values like "3.14", "api.example.com", "us-east" work because
// the schema declares unknownChars: 'tolerate'.
const FIFTY_LINE_INPUT = `name: my-project
version: 1.0.0
author: alice
license: MIT
description: parser3-codex yaml-block exit gate
language: typescript
target: esnext
strict: true
noEmit: false
outDir: dist
rootDir: src
moduleResolution: nodenext
verbatimModuleSyntax: true
declaration: true
declarationMap: true
composite: true
skipLibCheck: true
allowImportingTsExtensions: true
rewriteRelativeImportExtensions: true
forceConsistentCasingInFileNames: true
exactOptionalPropertyTypes: false
noUncheckedIndexedAccess: false
noImplicitOverride: true
noPropertyAccessFromIndexSignature: false
esModuleInterop: false
isolatedModules: true
incremental: false
paths: placeholder
baseUrl: dot
lib: esnext
types: node
typeRoots: node-modules
experimentalDecorators: false
emitDecoratorMetadata: false
plugins: none
watchOptions: none
buildOptions: none
references: none
exclude: dist
include: src
files: none
extends: base
tsBuildInfoFile: tsbuildinfo
diagnostics: false
traceResolution: false
listEmittedFiles: false
listFiles: false
pretty: true
preserveWatchOutput: false
assumeChangesOnlyAffectDirectDependencies: true`;

test('yaml-block: 50-line representative input parses', () => {
  const ast = render(FIFTY_LINE_INPUT, { type: 'ast' });
  assert.ok(ast !== null, 'render returned null');
  const mapping = ast as { type: string; entries: unknown[] };
  assert.equal(mapping.type, 'mapping', `expected type='mapping', got '${mapping.type}'`);
  assert.ok(
    mapping.entries.length >= 10,
    `expected ≥10 top-level entries, got ${mapping.entries.length}`,
  );
});
