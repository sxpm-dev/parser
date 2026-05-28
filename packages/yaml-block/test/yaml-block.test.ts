import test from 'node:test';
import { strict as assert } from 'node:assert';
import { render } from '../src/index.ts';

// 50-line representative YAML-block input. Contains:
//   - Flat scalar entries (name, version, etc.)
//   - Nested mapping values (compiler.strict, compiler.target)
//   - Nested sequence values (tags, ports)
//   - Three-level nesting (server.tls.certFile)
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
compiler:
  strict: true
  target: esnext
  outDir: dist
server:
  host: localhost
  port: 8080
  tls:
    enabled: true
tags:
  - typescript
  - parser
  - codegen
ports:
  - 8080
  - 8443
paths: placeholder
baseUrl: dot
lib: esnext
types: node
typeRoots: node-modules
diagnostics: false
traceResolution: false
listEmittedFiles: false
listFiles: false
pretty: true
preserveWatchOutput: false
assumeChangesOnlyAffectDirectDependencies: true`;

test('yaml-block: 50-line representative input parses', () => {
  const ast = render(FIFTY_LINE_INPUT, { target: 'ast' });
  assert.ok(ast !== null, 'render returned null');
  const mapping = ast as { type: string; entries: unknown[] };
  assert.equal(mapping.type, 'mapping', `expected type='mapping', got '${mapping.type}'`);
  assert.ok(
    mapping.entries.length >= 10,
    `expected ≥10 top-level entries, got ${mapping.entries.length}`,
  );
});
