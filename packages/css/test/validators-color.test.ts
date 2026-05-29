import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateParser } from '../../compiler/src/index.ts';
import colorSchema from '../src/validators/color.ts';

// Materialize the css-color sub-schema into an importable parser module.
//
// The Phase-A plan sketched a data: URL import for this step. That route
// works for plain JavaScript, but generateParser emits TypeScript (type
// aliases, parameter annotations); Node's built-in data: URL loader treats
// the payload as JS and rejects on the first `type` keyword. The css
// package's test runner is `tsx --test`, which intercepts file: URL
// imports and transforms TS on the fly. So we mirror the established
// loader pattern from packages/compiler/test/invert.test.ts: write the
// generated source to a temp `.ts` file and import its file URL. End-to-end
// coverage of generateParser is identical to the data: URL approach.
//
// Phase 5 removed the public `parse()` export from generated parsers — the
// AST is now reached via `render(input, { target: 'ast' })`. The css
// package's smoke test wraps that in a local `parse` helper; we follow the
// same convention so the assertions in this file read like the plan's
// intent.

type GeneratedColorModule = {
  render: (input: string, options?: { target?: 'ast' | 'source' }) => unknown;
  validate: (input: string) => void;
};

async function loadColorParser(): Promise<GeneratedColorModule> {
  const source = generateParser(colorSchema, undefined, { packageName: 'css-color' });
  const dir = mkdtempSync(join(tmpdir(), 'parser2-css-color-'));
  after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, source);
  return (await import(pathToFileURL(file).href)) as GeneratedColorModule;
}

const mod = await loadColorParser();

function parse(input: string): unknown {
  return mod.render(input, { target: 'ast' });
}

test('parses color keyword', () => {
  const ast = parse('red');
  assert.deepEqual(ast, { type: 'css-color', value: { type: 'color-keyword', value: 'red' } });
});

test('parses hash color', () => {
  const ast = parse('#00ff99');
  assert.deepEqual(ast, { type: 'css-color', value: { type: 'hash-color', value: '00ff99' } });
});

test('parses rgb function', () => {
  // The args field is part of the design contract — see color.ts header
  // (lines 51-54): the args list was previously dropped from the AST,
  // forcing this schema to capture it for round-trip fidelity.
  const ast = parse('rgb(255 0 0 / 1)') as { value: { type: string; name: string; args: unknown[] } };
  assert.equal(ast.value.type, 'rgb-color-function');
  assert.equal(ast.value.name, 'rgb');
  assert.ok(Array.isArray(ast.value.args) && ast.value.args.length >= 3);
});

test('parses oklch function', () => {
  const ast = parse('oklch(60% 0.2 30)') as { value: { type: string; name: string; args: unknown[] } };
  assert.equal(ast.value.type, 'color-function');
  assert.equal(ast.value.name, 'oklch');
  assert.ok(Array.isArray(ast.value.args) && ast.value.args.length >= 3);
});

test('parses var function', () => {
  const ast = parse('var(--brand-color, red)') as { value: { type: string; args: unknown } };
  assert.equal(ast.value.type, 'var-function');
  assert.ok(ast.value.args !== undefined);
});

test('validate accepts valid colors', () => {
  assert.doesNotThrow(() => mod.validate('red'));
  assert.doesNotThrow(() => mod.validate('#abc123'));
  assert.doesNotThrow(() => mod.validate('rgb(255 0 0)'));
  assert.doesNotThrow(() => mod.validate('oklch(60% 0.2 30)'));
  assert.doesNotThrow(() => mod.validate('var(--brand-color, red)'));
});

test('validate rejects non-color strings', () => {
  assert.throws(() => mod.validate('not-a-color-keyword'));
  assert.throws(() => mod.validate('123px'));
  assert.throws(() => mod.validate(''));
});

// Phase 1.5 follow-up — .lengths([3, 4, 6, 8]) on the hex span now emits
// as a post-scan width check in both v2 codegen and the interpreter, so
// malformed widths like `#12` or `#123456789` are rejected.
test('validate rejects malformed short hex #12 (Phase 1.5 follow-up)', () => {
  assert.throws(() => mod.validate('#12'));
});
test('validate rejects malformed long hex #123456789 (Phase 1.5 follow-up)', () => {
  assert.throws(() => mod.validate('#123456789'));
});
