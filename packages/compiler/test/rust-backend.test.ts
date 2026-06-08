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

test('rust backend (6.2): .optional() on a named ident span emits an Option<String>', () => {
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('X', {
        input: 'foo bar',
        encodings: {
          src: parse([
            span('a', 'foo').ident(),
            span('b', 'bar').ident().optional(),
          ]),
          ast: { type: 'pair', a: $.a, b: $.b },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  assert.match(code, /let b: Option<String> = 'opt: loop \{/);
  assert.match(code, /break 'opt None;/);
  assert.match(code, /break 'opt Some\(state\.src\[__opt_start\.\.state\.pos\]\.to_string\(\)\);/);
  assert.match(code, /if b\.is_none\(\) \{ state\.pos = __b_snapshot; \}/);
  // Render-body: $.b resolves to opt_str(&b).
  assert.match(code, /opt_str\(&b\)/);
  // Non-optional spans stay String-shaped.
  assert.match(code, /let a: String =/);
  // The opt_str helper is in the preamble.
  assert.match(code, /fn opt_str\(s: &Option<String>\) -> Value \{/);
});

test('rust backend (6.2): unnamed optional literal compiles to a tolerance match', () => {
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('X', {
        input: 'foo;',
        encodings: {
          src: parse([
            span('name', 'foo').ident(),
            literal(';').optional(),
          ]),
          ast: { type: 'x', name: $.name },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  // Unnamed optional literal → single discarded match_literal call.
  assert.match(code, /let _ = match_literal\(state, ";"\);/);
});

// Note on $.name.present: the TS-side inverse derivation rejects span-
// presence refs in any render body (see feature-parity.test.ts row
// `structureRef:span-presence` — deliberate gap pending Phase 4
// formatter/preservation work). The Rust backend nevertheless emits the
// right shape on the forward path (`Value::Bool(name.is_some())` for
// optional spans, hard error for non-optional spans). A future session
// closing the global span-presence gap will also unlock end-to-end
// schema tests here.

test('rust backend (6.2): .until() emits a balanced-bracket scan + trim capture', () => {
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      relation('Decl', {
        input: 'color: red',
        encodings: {
          src: parse([
            span('prop', 'color').until(':'),
            literal(':'),
            span('value', 'red').until(';'),
          ]),
          ast: { type: 'decl', prop: $.prop, value: $.value },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  // Stops literal array baked into the scan body.
  assert.match(code, /let __stops: &\[&\[u8\]\] = &\[":"\.as_bytes\(\)\];/);
  assert.match(code, /let __stops: &\[&\[u8\]\] = &\[";"\.as_bytes\(\)\];/);
  // Depth tracking on by default (balanced=true).
  assert.match(code, /let mut __depth: i32 = 0;/);
  assert.match(code, /__depth \+= 1;/);
  assert.match(code, /__depth -= 1;/);
  // Trim'd capture binding.
  assert.match(code, /let prop: String = state\.src\[__prop_start\.\.__prop_end\]\.trim\(\)\.to_string\(\);/);
});

test('rust backend (6.2): .until() with multi-stop array', () => {
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      relation('Decl', {
        input: 'foo:bar',
        encodings: {
          src: parse([
            span('value', 'foo').until([':', ';', '}']),
            literal(':'),
            span('rest', 'bar').ident(),
          ]),
          ast: { type: 'decl', value: $.value, rest: $.rest },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  // All three stop literals appear in the scan body's __stops array.
  assert.match(
    code,
    /let __stops: &\[&\[u8\]\] = &\[":"\.as_bytes\(\), ";"\.as_bytes\(\), "\}"\.as_bytes\(\)\];/,
  );
});

test('rust backend: rejects unsupported modifiers with Phase-6.2 error', () => {
  const schema = defineSchema({
    rootType: 'List',
    examples: [
      relation('Item', {
        input: 'x',
        encodings: {
          src: parse([span('n', 'x').ident()]),
          ast: { type: 'item', n: $.n },
        },
      }),
      relation('List', {
        input: 'x',
        encodings: {
          src: parse([
            span('items', 'x').of('Item').repeats({ sep: ',' }),
          ]),
          ast: { type: 'list', items: $.items },
        },
      }),
    ],
  });
  // .repeats triggers recursive-roles first (Phase 6.3). Test the
  // modifier-only path with a hypothetical noWhitespaceAfter.
  assert.throws(
    () => generateParser(
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: 'a b',
            encodings: {
              src: parse([
                span('x', 'a').ident().noWhitespaceAfter(),
                span('y', 'b').ident(),
              ]),
              ast: { type: 'x', x: $.x, y: $.y },
            },
          }),
        ],
      }),
      undefined,
      { backend: RUST_BACKEND },
    ),
    /Phase 6\.2.*modifiers not yet supported/,
  );
});

test('rust backend (6.3): single-role recursive span calls parse_<Role> and captures Value', () => {
  const schema = defineSchema({
    rootType: 'Pair',
    examples: [
      relation('Item', {
        input: 'x',
        encodings: {
          src: parse([span('n', 'x').ident()]),
          ast: { type: 'item', n: $.n },
        },
      }),
      relation('Pair', {
        input: 'x',
        encodings: {
          src: parse([span('item', 'x').of('Item')]),
          ast: { type: 'pair', item: $.item },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  assert.match(code, /let item: Value = match parse_Item\(state\) \{/);
  assert.match(code, /Some\(v\) => v,/);
  assert.match(code, /None => \{ state\.pos = entry_pos; return None; \}/);
  // Render body references `item` directly (no Value::String wrap).
  assert.match(code, /\("item"\.to_string\(\), item\.clone\(\)\)/);
});

test('rust backend (6.3): multi-role recursive span tries each role in order', () => {
  const schema = defineSchema({
    rootType: 'Node',
    examples: [
      relation('A', {
        input: 'a',
        encodings: { src: parse([literal('a')]), ast: { type: 'a' } },
      }),
      relation('B', {
        input: 'b',
        encodings: { src: parse([literal('b')]), ast: { type: 'b' } },
      }),
      relation('Node', {
        input: 'a',
        encodings: {
          src: parse([span('child', 'a').of('A', 'B')]),
          ast: { type: 'node', child: $.child },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  assert.match(code, /'rec: loop \{/);
  assert.match(code, /if let Some\(v\) = parse_A\(state\) \{ break 'rec v; \}/);
  assert.match(code, /if let Some\(v\) = parse_B\(state\) \{ break 'rec v; \}/);
});

test('rust backend (6.3): optional recursive span captures Option<Value>', () => {
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('Item', {
        input: 'x',
        encodings: {
          src: parse([span('n', 'x').ident()]),
          ast: { type: 'item', n: $.n },
        },
      }),
      relation('X', {
        input: 'x',
        encodings: {
          src: parse([span('child', 'x').of('Item').optional()]),
          ast: { type: 'x', child: $.child },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  assert.match(code, /let child: Option<Value> = 'opt: loop \{/);
  assert.match(code, /if let Some\(v\) = parse_Item\(state\) \{ break 'opt Some\(v\); \}/);
  assert.match(code, /break 'opt None;/);
  // opt_value helper preamble.
  assert.match(code, /fn opt_value\(v: &Option<Value>\) -> Value/);
  // Render reference uses opt_value.
  assert.match(code, /opt_value\(&child\)/);
});

test('rust backend (6.3): .repeats({sep}) collects Vec<Value>', () => {
  const schema = defineSchema({
    rootType: 'List',
    punctuators: { comma: ',' },
    examples: [
      relation('Item', {
        input: 'x',
        encodings: {
          src: parse([span('n', 'x').ident()]),
          ast: { type: 'item', n: $.n },
        },
      }),
      relation('List', {
        input: 'x,y',
        encodings: {
          src: parse([
            span('items', 'x').of('Item').repeats({ sep: ',' }),
          ]),
          ast: { type: 'list', items: $.items },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  assert.match(code, /let mut items: Vec<Value> = Vec::new\(\);/);
  assert.match(code, /let __item = parse_Item\(state\);/);
  assert.match(code, /match __item \{/);
  assert.match(code, /Some\(v\) => items\.push\(v\),/);
  assert.match(code, /if !match_literal\(state, ","\) \{/);
  // Render body: Value::Array(items.clone()).
  assert.match(code, /Value::Array\(items\.clone\(\)\)/);
});

test('rust backend (6.3): .repeats({min: 1}) enforces a minimum count', () => {
  const schema = defineSchema({
    rootType: 'List',
    examples: [
      relation('Item', {
        input: 'x',
        encodings: {
          src: parse([span('n', 'x').ident()]),
          ast: { type: 'item', n: $.n },
        },
      }),
      relation('List', {
        input: 'x',
        encodings: {
          src: parse([
            span('items', 'x').of('Item').repeats({ min: 1 }),
          ]),
          ast: { type: 'list', items: $.items },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  assert.match(code, /if items\.len\(\) < 1 \{/);
  assert.match(code, /state\.pos = entry_pos;/);
  assert.match(code, /return None;/);
});

test('rust backend (6.4): per-production stringify fn + dispatcher + public entry', () => {
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('X', {
        input: 'foo',
        encodings: {
          src: parse([span('name', 'foo').ident()]),
          ast: { type: 'x', name: $.name },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  assert.match(code, /fn stringify_X__alt0\(value: &Value\) -> Option<String> \{/);
  assert.match(code, /fn stringify_X\(value: &Value\) -> String \{/);
  assert.match(code, /pub fn stringify\(value: &Value\) -> String \{/);
  // Type discriminator check (match-based since the discriminator
  // strengthening pass — equality on every scalar field, absence on
  // sibling-only fields).
  assert.match(code, /match value\.obj_get\("type"\) \{ Some\(Value::String\(s\)\) if s == "x" => \(\), _ => return None \}/);
  // Capture extraction.
  assert.match(code, /let name = value\.obj_get\("name"\);/);
  // String emission.
  assert.match(code, /if let Some\(Value::String\(s\)\) = name \{ __out\.push_str\(s\); \}/);
});

test('rust backend (6.4): literal spans appear verbatim in stringify output', () => {
  const schema = defineSchema({
    rootType: 'Decl',
    punctuators: { colon: ':' },
    examples: [
      relation('Decl', {
        input: 'a:b',
        encodings: {
          src: parse([
            span('prop', 'a').ident(),
            literal(':'),
            span('value', 'b').ident(),
          ]),
          ast: { type: 'decl', prop: $.prop, value: $.value },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  // The literal `:` between prop and value is pushed verbatim.
  assert.match(code, /__out\.push_str\(":"\);/);
});

test('rust backend (6.4): recursive span calls stringify_<Role> on the inner value', () => {
  const schema = defineSchema({
    rootType: 'Pair',
    examples: [
      relation('Item', {
        input: 'x',
        encodings: {
          src: parse([span('n', 'x').ident()]),
          ast: { type: 'item', n: $.n },
        },
      }),
      relation('Pair', {
        input: 'x',
        encodings: {
          src: parse([span('item', 'x').of('Item')]),
          ast: { type: 'pair', item: $.item },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  assert.match(code, /if let Some\(inner\) = item \{ __out\.push_str\(&stringify_Item\(inner\)\); \}/);
});

test('rust backend (6.4): .repeats stringifies with declared separator', () => {
  const schema = defineSchema({
    rootType: 'List',
    punctuators: { comma: ',' },
    examples: [
      relation('Item', {
        input: 'x',
        encodings: {
          src: parse([span('n', 'x').ident()]),
          ast: { type: 'item', n: $.n },
        },
      }),
      relation('List', {
        input: 'x',
        encodings: {
          src: parse([
            span('items', 'x').of('Item').repeats({ sep: ',' }),
          ]),
          ast: { type: 'list', items: $.items },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND });
  assert.match(code, /if let Some\(Value::Array\(items\)\) = items \{/);
  assert.match(code, /if i > 0 \{ __out\.push_str\(","\); \}/);
  assert.match(code, /__out\.push_str\(&stringify_Item\(item\)\);/);
});

test('rust backend (6.3): cron schema compiles end-to-end (no CompilerError)', async () => {
  // The smallest non-trivial schema in the repo: covers literal, ident,
  // number.int(), optional, single-role recursion (.of('CronField')),
  // and recursive repeats (.of('CommandWord').repeats({min: 1})).
  const { default: schema } = await import('../../cron/src/schema.ts');
  const code = generateParser(schema, undefined, { backend: RUST_BACKEND, packageName: 'cron' });
  // Sanity check: the public render entry references the root.
  assert.match(code, /pub fn render\(input: &str\) -> Result<Value, String>/);
  assert.match(code, /parse_Cron\(&mut state\)/);
  // Each NodeType produces at least one alt fn + a dispatcher.
  assert.match(code, /fn parse_Cron__alt0\(state: &mut State\) -> Option<Value>/);
  assert.match(code, /fn parse_CronField__alt0\(state: &mut State\) -> Option<Value>/);
  assert.match(code, /fn parse_Command__alt0\(state: &mut State\) -> Option<Value>/);
  assert.match(code, /fn parse_CommandWord__alt0\(state: &mut State\) -> Option<Value>/);
  // Recursive call to CronField is in place.
  assert.match(code, /parse_CronField\(state\)/);
  // The optional command capture path is emitted.
  assert.match(code, /Option<Value>/);
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
