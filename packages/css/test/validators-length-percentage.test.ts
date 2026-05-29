import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateParser } from '../../compiler/src/index.ts';
import lengthSchema from '../src/validators/length-percentage.ts';

// Materialize the css-length-percentage sub-schema into an importable parser
// module. We follow the loader pattern established by validators-color.test.ts:
// the data: URL approach sketched in the Phase-B plan does not work because
// generateParser emits TypeScript (type aliases, parameter annotations) and
// Node's built-in data: URL loader bails on the first `type` keyword. The css
// package's test runner is `tsx --test`, which transforms TS on file: URL
// imports, so writing the generated source to a temp `.ts` file and importing
// its file URL gives full end-to-end coverage of generateParser.
//
// Phase 5 removed the public `parse()` export from generated parsers — the AST
// is reached via `render(input, { target: 'ast' })`. We wrap that in a local
// `parse` helper, mirroring smoke.test.ts and validators-color.test.ts.

type GeneratedLengthModule = {
  render: (input: string, options?: { target?: 'ast' | 'source' }) => unknown;
  validate: (input: string) => void;
};

async function loadLengthParser(): Promise<GeneratedLengthModule> {
  const source = generateParser(lengthSchema, undefined, { packageName: 'css-length-percentage' });
  const dir = mkdtempSync(join(tmpdir(), 'parser2-css-length-percentage-'));
  after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, source);
  return (await import(pathToFileURL(file).href)) as GeneratedLengthModule;
}

const mod = await loadLengthParser();

function parse(input: string): unknown {
  return mod.render(input, { target: 'ast' });
}

test('parses dimension', () => {
  const ast = parse('10px') as { type: string; items: Array<{ type: string }> };
  assert.equal(ast.type, 'css-length-percentage');
  assert.equal(ast.items[0].type, 'dimension');
});

test('parses percentage', () => {
  const ast = parse('50%') as { items: Array<{ type: string }> };
  assert.equal(ast.items[0].type, 'percentage');
});

test('parses negative percentage', () => {
  const ast = parse('-50%') as { items: Array<{ type: string }> };
  assert.equal(ast.items[0].type, 'percentage');
});

test('parses zero', () => {
  const ast = parse('0') as { items: Array<{ type: string; value: string }> };
  assert.deepEqual(ast.items[0], { type: 'zero', value: '0' });
});

test('parses calc expression', () => {
  // The args field is part of the design contract — the schema explicitly
  // captures the token list for round-trip fidelity (length-percentage.ts:151).
  const ast = parse('calc(100% - 1rem)') as {
    items: Array<{ type: string; name: string; args: unknown[] }>;
  };
  assert.equal(ast.items[0].type, 'length-function');
  assert.equal(ast.items[0].name, 'calc');
  assert.ok(Array.isArray(ast.items[0].args) && ast.items[0].args.length >= 3);
});

test('parses var function', () => {
  const ast = parse('var(--space, 1rem)') as {
    items: Array<{ type: string; name: string; args: unknown }>;
  };
  assert.equal(ast.items[0].type, 'var-function');
  assert.equal(ast.items[0].name, 'var');
  assert.ok(ast.items[0].args !== undefined);
});

test('parses multi-item shorthand', () => {
  const ast = parse('10px 20px 5px 0') as { items: unknown[] };
  assert.equal(ast.items.length, 4);
});

test('validate accepts valid lengths', () => {
  assert.doesNotThrow(() => mod.validate('10px'));
  assert.doesNotThrow(() => mod.validate('2rem'));
  assert.doesNotThrow(() => mod.validate('100%'));
  assert.doesNotThrow(() => mod.validate('auto'));
});

test('validate accepts decimal lengths', () => {
  // Real-world CSS uses decimals routinely. The schema's value spans declare
  // `.number().float()` so the integer prefix can be followed by an optional
  // `.fraction` (no exponent required).
  assert.doesNotThrow(() => mod.validate('1.5rem'));
  assert.doesNotThrow(() => mod.validate('0.5em'));
  assert.doesNotThrow(() => mod.validate('2.5%'));
  assert.doesNotThrow(() => mod.validate('-1.25px'));
  assert.doesNotThrow(() => mod.validate('-0.75%'));
});

test('parses decimal dimension AST shape', () => {
  const ast = parse('1.5rem') as { items: Array<{ type: string; value: string; unit: string }> };
  assert.equal(ast.items[0].type, 'dimension');
  assert.equal(ast.items[0].value, '1.5');
  assert.equal(ast.items[0].unit, 'rem');
});

test('parses decimal percentage AST shape', () => {
  const ast = parse('2.5%') as { items: Array<{ type: string; value: string }> };
  assert.equal(ast.items[0].type, 'percentage');
  assert.equal(ast.items[0].value, '2.5');
});

test('validate rejects non-lengths', () => {
  assert.throws(() => mod.validate('red'));
  assert.throws(() => mod.validate('123notaunit'));
  assert.throws(() => mod.validate(''));
});
