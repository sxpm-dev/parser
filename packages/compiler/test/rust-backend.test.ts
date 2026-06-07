// Rust backend — Phase 6.0 snapshot tests.
//
// rustc is not assumed to be installed; the tests pin the emitted source
// shape so a regression in the Rust emitter shows up here rather than only
// at differential-test time (Phase 6.5). A future session with cargo
// available will layer a compile-and-run smoke test that asserts the
// generated parser matches the TS backend on a shared corpus.
//
// Backend conformance: name, fileExtension, emit() signature.
// Scope coverage: single-production literal, multi-alt dispatcher, ident
// span with `$.name` capture, the dispatch + render entry point shape.
// Negative cases: unsupported primitives (.repeats, recursive) surface a
// CompilerError with a Phase-6.0-says-no message.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { $, defineSchema, literal, parse, relation, span } from '@parser2/parser';
import { generateParser } from '../src/index.ts';
import { RUST_BACKEND } from '../src/emit/rust/index.ts';
import type { Backend } from '../src/emit/backend.ts';

test('rust backend: conforms to Backend interface', () => {
  const b: Backend = RUST_BACKEND;
  assert.equal(b.name, 'rust');
  assert.equal(b.fileExtension, '.rs');
  assert.equal(typeof b.emit, 'function');
});

test('rust backend: emits header + Value + State preamble', () => {
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('X', {
        input: 'hello',
        encodings: {
          src: parse([literal('hello')]),
          ast: { type: 'x' },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  assert.match(code, /\/\/ Auto-generated from packages\/.+\/src\/schema\.ts/);
  assert.match(code, /#!\[allow\(dead_code, unused_variables, non_snake_case, clippy::all\)\]/);
  assert.match(code, /pub enum Value \{/);
  assert.match(code, /Null,\n\s*Bool\(bool\),\n\s*Number\(f64\),\n\s*String\(String\),/);
  assert.match(code, /struct State<'a> \{/);
  assert.match(code, /fn skip_ws\(state: &mut State\) \{/);
  assert.match(code, /fn match_literal\(state: &mut State, lit: &str\) -> bool \{/);
});

test('rust backend: single-literal production emits a literal match + Object AST', () => {
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('X', {
        input: 'hello',
        encodings: {
          src: parse([literal('hello')]),
          ast: { type: 'x' },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  assert.match(code, /fn parse_X__alt0\(state: &mut State\) -> Option<Value> \{/);
  assert.match(code, /if !match_literal\(state, "hello"\) \{/);
  assert.match(code, /Value::Object\(vec!\[\("type"\.to_string\(\), Value::String\("x"\.to_string\(\)\)\)\]\)/);
  assert.match(code, /fn parse_X\(state: &mut State\) -> Option<Value> \{/);
  assert.match(code, /pub fn render\(input: &str\) -> Result<Value, String> \{/);
});

test('rust backend: ident span captures the slice + Object AST references it', () => {
  const schema = defineSchema({
    rootType: 'Tag',
    examples: [
      relation('Tag', {
        input: 'foo',
        encodings: {
          src: parse([span('name', 'foo').ident()]),
          ast: { type: 'tag', name: $.name },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  assert.match(code, /let __name_start = state\.pos;/);
  assert.match(code, /while state\.pos < state\.input\.len\(\) && \(?is_ident_cont\(state\.input\[state\.pos\]\)\)? \{/);
  assert.match(code, /let __name_end = state\.pos;/);
  assert.match(code, /let name: String = state\.src\[__name_start\.\.__name_end\]\.to_string\(\);/);
  assert.match(code, /Value::String\(name\.clone\(\)\)/);
});

test('rust backend: multi-production node emits a dispatcher trying each alt in order', () => {
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('X', {
        input: 'a',
        encodings: { src: parse([literal('a')]), ast: { type: 'a' } },
      }),
      relation('X', {
        input: 'b',
        encodings: { src: parse([literal('b')]), ast: { type: 'b' } },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  assert.match(code, /fn parse_X__alt0\(state: &mut State\) -> Option<Value>/);
  assert.match(code, /fn parse_X__alt1\(state: &mut State\) -> Option<Value>/);
  // The dispatcher tries alt0 first, then alt1.
  const dispatcher = code.match(/fn parse_X\(state: &mut State\) -> Option<Value> \{[\s\S]+?^\}/m);
  assert.ok(dispatcher, 'dispatcher function must exist');
  const body = dispatcher![0];
  const alt0Idx = body.indexOf('parse_X__alt0');
  const alt1Idx = body.indexOf('parse_X__alt1');
  assert.ok(alt0Idx > 0 && alt1Idx > alt0Idx, 'alt0 must be tried before alt1');
});

test('rust backend: render entry calls into the root and rejects trailing input', () => {
  const schema = defineSchema({
    rootType: 'Root',
    examples: [
      relation('Root', {
        input: 'x',
        encodings: { src: parse([literal('x')]), ast: { type: 'r' } },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  assert.match(code, /pub fn render\(input: &str\) -> Result<Value, String>/);
  assert.match(code, /let mut state = State::new\(input\);/);
  assert.match(code, /parse_Root\(&mut state\)/);
  assert.match(code, /if state\.pos != state\.input\.len\(\) \{/);
});

test('rust backend: rejects unsupported modifiers with Phase-6.0 error', () => {
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('X', {
        input: 'a',
        encodings: {
          src: parse([span('x', 'a').ident().optional()]),
          ast: { type: 'x' },
        },
      }),
    ],
  });
  assert.throws(
    () => generateParser(schema, undefined, { backend: RUST_BACKEND }),
    /Phase 6\.0.*modifiers not yet supported/,
  );
});

test('rust backend: rejects recursive spans with Phase-6.0 error', () => {
  const schema = defineSchema({
    rootType: 'List',
    examples: [
      relation('Item', {
        input: 'x',
        encodings: {
          src: parse([span('n', 'x').ident()]),
          ast: { type: 'item' },
        },
      }),
      relation('List', {
        input: 'x',
        encodings: {
          src: parse([span('item', 'x').of('Item')]),
          ast: { type: 'list' },
        },
      }),
    ],
  });
  assert.throws(
    () => generateParser(schema, undefined, { backend: RUST_BACKEND }),
    /Phase 6\.0.*recursive spans not yet supported/,
  );
});

test('rust backend (6.1): number().int() scans digits and captures the slice', () => {
  const schema = defineSchema({
    rootType: 'N',
    examples: [
      relation('N', {
        input: '42',
        encodings: {
          src: parse([span('value', '42').number().int()]),
          ast: { type: 'n', value: $.value },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  // is_digit predicate must be present in the preamble.
  assert.match(code, /fn is_digit\(b: u8\) -> bool \{/);
  // Integer-only — no fractional tail.
  assert.match(
    code,
    /while state\.pos < state\.input\.len\(\) && \(is_digit\(state\.input\[state\.pos\]\)\) \{[\s\S]+?state\.pos \+= 1;[\s\S]+?\}/,
  );
  assert.doesNotMatch(code, /b'\.' /);
  // Capture binds the slice.
  assert.match(code, /let value: String = state\.src\[__value_start\.\.__value_end\]\.to_string\(\);/);
});

test('rust backend (6.1): plain number() admits fractional + exponent tail', () => {
  const schema = defineSchema({
    rootType: 'N',
    examples: [
      relation('N', {
        input: '3.14',
        encodings: {
          src: parse([span('value', '3.14').number()]),
          ast: { type: 'n', value: $.value },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  // Decimal-point branch.
  assert.match(code, /if state\.pos < state\.input\.len\(\) && state\.input\[state\.pos\] == b'\.' \{/);
  // Exponent branch.
  assert.match(code, /state\.input\[state\.pos\] == b'e' \|\| state\.input\[state\.pos\] == b'E'/);
});

test('rust backend (6.1): string().doubleQuoted() consumes "..." with \\\\ escapes', () => {
  const schema = defineSchema({
    rootType: 'S',
    examples: [
      relation('S', {
        input: '"hi"',
        encodings: {
          src: parse([span('s', '"hi"').string().doubleQuoted()]),
          ast: { type: 's', s: $.s },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  assert.match(code, /state\.input\[state\.pos\] != b'"'/);
  assert.match(code, /if b == b'\\\\' && state\.pos \+ 1 < state\.input\.len\(\) \{/);
  assert.match(code, /state\.pos \+= 2;/);
  // Closing-quote branch breaks out of the scan loop.
  assert.match(code, /if b == b'"' \{/);
});

test('rust backend (6.1): string().singleQuoted() targets the apostrophe', () => {
  const schema = defineSchema({
    rootType: 'S',
    examples: [
      relation('S', {
        input: "'hi'",
        encodings: {
          src: parse([span('s', "'hi'").string().singleQuoted()]),
          ast: { type: 's', s: $.s },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  assert.match(code, /state\.input\[state\.pos\] != b'\\''/);
  assert.match(code, /if b == b'\\'' \{/);
});

test('rust backend: per-production fn name follows parse_<NodeType>__alt<idx>', () => {
  // Phase 6.0 contract: the alt-fn name matches what the dispatcher calls.
  // A regression where one emits PascalCase and the other snake_case would
  // produce code that compiles partially but the dispatcher can't reach
  // the alt body.
  const schema = defineSchema({
    rootType: 'Header',
    examples: [
      relation('Header', {
        input: 'foo',
        encodings: {
          src: parse([span('name', 'foo').ident()]),
          ast: { type: 'header', name: $.name },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  assert.match(code, /fn parse_Header__alt0\b/);
  assert.match(code, /parse_Header__alt0\(state\)/);
  assert.match(code, /parse_Header\(&mut state\)/);
});
