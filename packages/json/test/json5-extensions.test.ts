import test from 'node:test';
import { strict as assert } from 'node:assert';
import { render, stringify } from '../src/index.ts';

// Block comments — strict-JSON-equivalent value after stripping the comment.
test('JSON5: block comment between value and EOF', () => {
  assert.equal(render('42 /* trailing */', { target: 'ast' }), 42);
});

// Block comments INSIDE arrays / objects are now handled by the
// repeats()-sep-sweep's comment-aware skip (Phase 4c v4, 2026-06-07):
// when the schema declares the `comment` token class AND none of the
// repeats roles consume comments themselves, the sweep eats `/* ... */`
// alongside whitespace between iterations. JSON's array/object bodies
// don't expose Comment as a role, so the sweep applies and comments
// round-trip into stringify's canonical (no-comment) output.
test('JSON5: block comment inside array', () => {
  assert.deepEqual(render('[1, /* two */ 2, 3]', { target: 'ast' }), [1, 2, 3]);
});

test('JSON5: block comment inside object', () => {
  assert.deepEqual(render('{"a": 1, /* note */ "b": 2}', { target: 'ast' }), { a: 1, b: 2 });
});

test('JSON5: stringify drops comments (canonical output)', () => {
  const v = render('{"a": 1, /* note */ "b": 2}', { target: 'ast' });
  assert.equal(stringify(v, { target: 'ast' }), '{"a":1,"b":2}');
});

// Line comments (Phase 4c v5, 2026-06-07): schemas opt into JSON5 line
// comments by declaring `tokens: [..., { class: 'comment', refinements:
// [{ name: 'line', args: ['//'] }] }]`. The compiler emits a leading /
// trailing / inter-span / sep-sweep skip that consumes `<marker>...\n`
// runs alongside whitespace and block comments.
test('JSON5: line comment before value', () => {
  assert.equal(render('// note\n42', { target: 'ast' }), 42);
});

test('JSON5: line comment after value', () => {
  assert.equal(render('42 // note\n', { target: 'ast' }), 42);
});

test('JSON5: line comment inside array', () => {
  assert.deepEqual(render('[1, // one\n 2, 3]', { target: 'ast' }), [1, 2, 3]);
});

test('JSON5: line comment inside object', () => {
  assert.deepEqual(render('{"a":1, // a\n "b":2}', { target: 'ast' }), { a: 1, b: 2 });
});

// Trailing commas: allow but stringify emits canonical (no trailing comma).
test('JSON5: trailing comma in array', () => {
  assert.deepEqual(render('[1,2,3,]', { target: 'ast' }), [1, 2, 3]);
});

test('JSON5: trailing comma in object', () => {
  assert.deepEqual(render('{"a":1,"b":2,}', { target: 'ast' }), { a: 1, b: 2 });
});

test('JSON5: stringify drops trailing commas (canonical output)', () => {
  const v = render('[1,2,3,]', { target: 'ast' });
  assert.equal(stringify(v, { target: 'ast' }), '[1,2,3]');
});

// Single-quoted strings (Phase 4c v6, 2026-06-07): the compiler now
// applies a "first-declared wins" relaxation for indistinguishable
// inverse shapes. Two JsonString productions can share the same
// `ast: $.value` body; the canonical (double-quoted) production's
// inverter handles every string value, so single-quoted input parses
// and stringify canonicalizes to the double-quoted form.
test('JSON5: single-quoted string', () => {
  assert.equal(render("'hello'", { target: 'ast' }), 'hello');
});

test('JSON5: stringify canonicalizes single-quoted to double quotes', () => {
  const v = render("'hello'", { target: 'ast' });
  assert.equal(stringify(v, { target: 'ast' }), '"hello"');
});

test('JSON5: unquoted identifier key', () => {
  assert.deepEqual(render('{a:1}', { target: 'ast' }), { a: 1 });
});

test('JSON5: unquoted multi-entry', () => {
  assert.deepEqual(render('{name:"alice",age:30}', { target: 'ast' }), { name: 'alice', age: 30 });
});

test('JSON5: stringify canonicalizes unquoted to quoted keys', () => {
  const v = render('{a:1,b:2}', { target: 'ast' });
  assert.equal(stringify(v, { target: 'ast' }), '{"a":1,"b":2}');
});
