# Phase 9 — `relation()` DSL clean break — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename and reshape the user-facing schema DSL from `ex(input).as(NodeType).span(...).render(...).build()` to a declarative `relation(NodeType, { input, encodings })`; rewrite all 5 in-scope schemas onto the new form; delete the old builder and the 8 out-of-scope packages.

**Architecture:** Engine-preserving refactor. `relation(...)` produces values structurally equivalent to today's `ExampleDef`; the rest of `packages/compiler/` is untouched. Generated parsers must be byte-identical before vs. after each schema rewrite (SHA256 hash-equality gate). One small public-API rename (`type` → `target` on `render(...)` and `stringify(...)`) lands as its own task with a deliberate one-time generated-parser hash change.

**Tech Stack:** TypeScript, npm workspaces, `node --test`. No new dependencies.

**Reference design:** `docs/superpowers/specs/2026-05-30-phase-9-relation-dsl-design.md`. **Reference spike:** `packages/parser/test/spike-relation.test.ts` (4 passing tests proving IR equivalence on representative production shapes).

---

## File map

**Files to create:**
- `packages/parser/src/relation.ts` — new builder (Task 9.1)
- `packages/parser/test/relation.test.ts` — builder unit tests (Task 9.1)
- `packages/parser/test/relation-ir-equivalence.test.ts` — IR-equivalence harness (Task 9.3)

**Files to modify:**
- `packages/parser/src/index.ts` — add exports (Task 9.1), remove `ex` export (Task 9.10)
- `packages/parser/src/example.ts` — delete file (Task 9.10)
- `packages/parser/test/parser.test.ts` — remove `ex`-coupled tests (Task 9.10)
- `packages/compiler/src/emit/render.ts:368-369` — type → target (Task 9.4)
- `packages/compiler/src/emit/inverse.ts:904-905` — type → target (Task 9.4)
- `packages/compiler/src/emit/bytecode/index.ts:96-97, 105-106` — type → target (Task 9.4)
- `packages/compiler/src/fuzz/runner.ts:40, 138, 199, 226, 242` — type → target in fuzz runner (Task 9.4)
- `packages/{css,html,markdown,cron,yaml-block}/test/*.test.ts` — type → target in all call sites (~33 sites) (Task 9.4)
- `packages/cron/src/schema.ts` — rewrite onto relation() (Task 9.5)
- `packages/yaml-block/src/schema.ts` — rewrite (Task 9.6)
- `packages/markdown/src/schema.ts` — rewrite (Task 9.7)
- `packages/html/src/schema.ts` — rewrite (Task 9.8)
- `packages/css/src/schema.ts` — rewrite (Task 9.9)
- Each of the 5 in-scope packages' `_generated/parser.ts` — regenerated, byte-identical to post-9.4 baseline
- `docs/v2-migration-status.md` — append Phase 9 closeout section (Task 9.12)
- `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md:797-840` — mark Phase 9 CLOSED (Task 9.12)

**Files/directories to delete:**
- `packages/parser/src/example.ts` (Task 9.10)
- `packages/parser/test/spike-relation.test.ts` (Task 9.12 — superseded by relation.test.ts)
- `packages/arn` (Task 9.11)
- `packages/js` (Task 9.11)
- `packages/log` (Task 9.11)
- `packages/mac` (Task 9.11)
- `packages/proto` (Task 9.11)
- `packages/url` (Task 9.11)
- `packages/css-color` (Task 9.11)
- `packages/css-length-percentage` (Task 9.11)

---

## Task 9.1 — New DSL primitives (`relation.ts`)

**Goal:** Land the immutable builder side-by-side with `ex()`. Both exports work; nothing else changes yet.

**Files:**
- Create: `packages/parser/src/relation.ts`
- Modify: `packages/parser/src/index.ts` (add exports)
- Create: `packages/parser/test/relation.test.ts`

- [ ] **Step 1: Write the failing test (smallest possible)**

Create `packages/parser/test/relation.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { $, literal, parse, relation, span, tpl } from '../src/index.ts';

test('relation: minimal heading produces ExampleDef with one literal + one named span', () => {
  const def = relation('MarkdownLeaf', {
    input: '# Release notes',
    encodings: {
      md: parse([
        literal('#'),
        span('text', 'Release notes').until('\n', { balanced: false }),
      ]),
      ast: { type: 'heading', depth: 1, text: $.text },
      html: tpl`<h1>${$.text}</h1>`,
      source: tpl`# ${$.text}`,
    },
  });

  assert.equal(def.input, '# Release notes');
  assert.equal(def.nodeType, 'MarkdownLeaf');
  assert.equal(def.spans.length, 2);
  assert.equal(def.spans[0]!.text, '#');
  assert.equal(def.spans[1]!.name, 'text');
  assert.equal(def.spans[1]!.text, 'Release notes');
  assert.equal(def.status.kind, 'valid');
  assert.equal(def.renders.length, 3);
  assert.deepEqual(def.renders.map((r) => r.target), ['ast', 'html', 'source']);
});
```

- [ ] **Step 2: Run the test — expect a module-not-found failure**

Run: `npm run test -w "@parser2/parser" 2>&1 | grep "relation"`
Expected: failure because `relation`, `parse`, `span`, `literal` are not exported from `../src/index.ts`.

- [ ] **Step 3: Implement `relation.ts`**

Create `packages/parser/src/relation.ts` (lifted from `packages/parser/test/spike-relation.test.ts` lines 26–286 with minor renames; see file for full source). The exported surface MUST be exactly:

```ts
export type Literal = SpanNode & { readonly __literal: true };
export type Span = SpanNode;
export type ParseProgram = { readonly __parse: true; readonly items: ReadonlyArray<SpanNode> };

export type RelationBody = {
  readonly input: string;
  readonly encodings: Readonly<Record<string, unknown>>;
  readonly status?: ExampleStatus;
};

export class SpanNode { /* see spike for full method list */ }
export function span(name: string, exampleText?: string): SpanNode;
export function literal(text: string): SpanNode;
export function parse(items: ReadonlyArray<SpanNode>): ParseProgram;
export function relation(nodeType: string, body: RelationBody): ExampleDef;
```

Implementation detail (differs from the spike's "Literal as SpanNode" approach): give `literal(...)` results a TypeScript brand `__literal: true` so the parse-program list type can disambiguate at compile time without runtime cost. The brand is type-only; at runtime, a `Literal` is just a `SpanNode` with `name === undefined`.

Implementation rule (matches user's coding-style rule against mutation): every chained method on `SpanNode` returns a NEW `SpanNode` via `new SpanNode({ ...this.data, ...patch })`. No `this.def.x = y` anywhere in the class.

- [ ] **Step 4: Add exports to `packages/parser/src/index.ts`**

Edit `packages/parser/src/index.ts` — add `relation`, `parse`, `span`, `literal` to the exports list:

```ts
export { relation, parse, span, literal } from './relation.ts';
export type { Literal, Span, ParseProgram, RelationBody } from './relation.ts';
```

DO NOT remove `export { ex } from './example.ts'` yet — both must coexist through Task 9.9. Removal is Task 9.10.

- [ ] **Step 5: Run the test — verify it passes**

Run: `npm run test -w "@parser2/parser" 2>&1 | grep -E "(relation:|^# (tests|pass|fail))"`
Expected: the relation test passes; total parser tests increase by exactly 1 (from 34 with the spike, to 35).

- [ ] **Step 6: Add full method-coverage tests in `relation.test.ts`**

For each public method on `SpanNode`, add at least one test asserting the resulting `SpanDef` shape. Pattern (from `packages/parser/test/parser.test.ts:42-72`):

```ts
test('relation: span chain accepts class, refinement, modifier', () => {
  const def = relation('Decl', {
    input: 'color: red',
    encodings: {
      src: parse([
        span('prop', 'color').ident().css(),
        literal(':'),
        span('value', 'red').ident().css(),
        literal(';').optional(),
      ]),
      ast: { prop: $.prop, value: $.value },
    },
  });
  assert.equal(def.spans.length, 4);
  const [prop, colon, value, semi] = def.spans;
  assert.equal(prop!.class, 'ident');
  assert.deepEqual(prop!.refinements, [{ name: 'css' }]);
  assert.equal(colon!.class, 'literal');
  assert.equal(colon!.text, ':');
  assert.equal(value!.class, 'ident');
  assert.equal(semi!.modifiers[0]?.kind, 'optional');
});

test('relation: repeats modifier captures options', () => {
  const def = relation('Decls', {
    input: 'a;b',
    encodings: {
      src: parse([
        span('items', 'a;b').of('Item').repeats({ sep: ';', trailing: 'allowed' }),
      ]),
      ast: { items: $.items },
    },
  });
  const sp = def.spans[0]!;
  const mod = sp.modifiers[0]!;
  assert.equal(mod.kind, 'repeats');
  if (mod.kind !== 'repeats') throw new Error('unreachable');
  assert.equal(mod.sep, ';');
  assert.equal(mod.trailing, 'allowed');
});

test('relation: .of() carries multiple recursive roles', () => {
  const def = relation('Container', {
    input: 'x',
    encodings: {
      src: parse([span('child', 'x').of('Rule', 'AtRule')]),
      ast: { child: $.child },
    },
  });
  assert.deepEqual(def.spans[0]!.recursiveRoles, ['Rule', 'AtRule']);
});
```

Add one test per uncovered method: every class (`.literal()`, `.ident()`, ..., `.operator(alts?)`), every refinement (`.int()`, ..., `.block(open, close)`), every modifier (`.until()`, `.rawUntil()`, `.noLineTerminatorAfter()`, `.noWhitespaceAfter()`, `.requireSpaceAfter()`, `.indent()`). Aim for ~30 tests total.

- [ ] **Step 7: Run full parser test suite**

Run: `npm run test -w "@parser2/parser" 2>&1 | tail -5`
Expected: `# tests >= 65 # pass >= 65 # fail 0`.

- [ ] **Step 8: Commit**

```bash
git add packages/parser/src/relation.ts packages/parser/src/index.ts packages/parser/test/relation.test.ts
git commit -m "feat(parser): introduce relation() DSL alongside ex() (Task 9.1)"
```

---

## Task 9.2 — Cross-validation in `relation(...)`

**Goal:** At relation construction, validate that `body.input` is consistent with the parse program. Hard-fail with a clear message at module load.

**Files:**
- Modify: `packages/parser/src/relation.ts`
- Modify: `packages/parser/test/relation.test.ts` (add validation tests)

- [ ] **Step 1: Write the failing tests**

Append to `packages/parser/test/relation.test.ts`:

```ts
test('relation: rejects when input is missing literal span text', () => {
  assert.throws(
    () =>
      relation('Bad', {
        input: 'foo',
        encodings: {
          src: parse([literal('#'), span('text', 'foo').until('\n')]),
          ast: { text: $.text },
        },
      }),
    /literal '#' not found in input/i,
  );
});

test('relation: rejects when named span example text not found in input', () => {
  assert.throws(
    () =>
      relation('Bad', {
        input: '# elsewhere',
        encodings: {
          src: parse([literal('#'), span('text', 'Release notes').until('\n')]),
          ast: { text: $.text },
        },
      }),
    /span 'text' example 'Release notes' not found in input/i,
  );
});

test('relation: accepts whitespace gaps between adjacent spans (standard policy)', () => {
  // input has two-space gap between '#' and 'foo' — standard whitespace
  // policy treats inter-span whitespace as optional, so validation must
  // tolerate a non-zero gap.
  const def = relation('Heading', {
    input: '#  foo',
    encodings: {
      src: parse([literal('#'), span('text', 'foo').until('\n')]),
      ast: { text: $.text },
    },
  });
  assert.equal(def.input, '#  foo');
});
```

- [ ] **Step 2: Run tests — expect them to fail**

Run: `npm run test -w "@parser2/parser" 2>&1 | grep -E "rejects|accepts"`
Expected: all three new tests fail (validation isn't implemented yet — the relation just trusts the author).

- [ ] **Step 3: Implement the cross-validation**

In `packages/parser/src/relation.ts`, add `validateInputAgainstProgram(input, items)` and call it from `relation(...)` before constructing the `ExampleDef`. Algorithm:

```ts
function validateInputAgainstProgram(
  nodeType: string,
  input: string,
  items: ReadonlyArray<SpanNode>,
): void {
  let cursor = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const text = item.data.text;
    if (text === undefined || text === '') continue;
    // Skip any leading whitespace at cursor (standard policy: inter-span
    // whitespace is optional). When this span has a `noWhitespaceAfter`
    // modifier on the PREVIOUS span we'd be stricter, but Phase 9 leaves
    // that refinement to the IR layer — input validation is best-effort
    // here and only catches outright mismatches.
    while (cursor < input.length && /\s/.test(input[cursor]!)) cursor++;
    const idx = input.indexOf(text, cursor);
    if (idx < 0) {
      const label = item.data.name === undefined ? `literal '${text}'` : `span '${item.data.name}' example '${text}'`;
      throw new Error(
        `relation('${nodeType}'): ${label} not found in input starting at offset ${cursor}`,
      );
    }
    if (idx !== cursor) {
      // Allow it — the gap is intervening whitespace (already skipped) or
      // content that belongs to a previous `.until(...)` span. We trust
      // the compiler's stricter IR-layer validation as the final word.
    }
    cursor = idx + text.length;
  }
}
```

Hook it in:

```ts
export function relation(nodeType: string, body: RelationBody): ExampleDef {
  // ... existing dispatch into parseProgram / renders ...
  validateInputAgainstProgram(nodeType, body.input, parseProgram.items);
  return { input: body.input, nodeType, spans, status, renders };
}
```

- [ ] **Step 4: Run the tests — verify they pass**

Run: `npm run test -w "@parser2/parser" 2>&1 | grep -E "rejects|accepts"`
Expected: all three pass.

- [ ] **Step 5: Run the spike + builder tests — verify no regression**

Run: `npm run test -w "@parser2/parser" 2>&1 | grep -E "^# (tests|pass|fail)"`
Expected: all tests still green, count unchanged from after Task 9.1.

- [ ] **Step 6: Commit**

```bash
git add packages/parser/src/relation.ts packages/parser/test/relation.test.ts
git commit -m "feat(parser): relation() cross-validates input vs parse program (Task 9.2)"
```

---

## Task 9.3 — IR-equivalence harness

**Goal:** Lock in the invariant that `relation(...)` produces an `ExampleDef` byte-equal to `ex(...)` for the same production. This protects against subtle drift during schema rewrites (Tasks 9.5–9.9).

**Files:**
- Create: `packages/parser/test/relation-ir-equivalence.test.ts`

- [ ] **Step 1: Move spike test cases into the equivalence harness**

Create `packages/parser/test/relation-ir-equivalence.test.ts`. Copy the four test bodies from `packages/parser/test/spike-relation.test.ts` (MarkdownHeading h1, MarkdownDocument, italic, thematic break). Rename the test descriptions to drop the "spike:" prefix.

DO NOT delete `spike-relation.test.ts` yet — it's removed in Task 9.12 closeout.

- [ ] **Step 2: Add coverage for the remaining tricky shapes**

Append three more cases that the spike didn't cover:

```ts
test('IR equivalence: ordered list (number class with int refinement)', () => {
  const viaEx = ex('1. ordered item')
    .as('MarkdownLeaf')
    .span('index', '1').number().int()
    .span('.')
    .span('text', 'ordered item').until('\n', { balanced: false })
    .render('ast', { type: 'list-item', ordered: true, index: $.index, text: $.text })
    .render('html', tpl`<li>${$.text}</li>`)
    .render('source', tpl`${$.index}. ${$.text}`)
    .build();

  const viaRelation = relation('MarkdownLeaf', {
    input: '1. ordered item',
    encodings: {
      md: parse([
        span('index', '1').number().int(),
        literal('.'),
        span('text', 'ordered item').until('\n', { balanced: false }),
      ]),
      ast: { type: 'list-item', ordered: true, index: $.index, text: $.text },
      html: tpl`<li>${$.text}</li>`,
      source: tpl`${$.index}. ${$.text}`,
    },
  });

  assert.deepEqual(viaRelation, viaEx);
});

test('IR equivalence: rawUntil (HTML block body)', () => {
  const viaEx = ex('<div>html</div>')
    .as('MarkdownLeaf')
    .span('<')
    .span('tag', 'div').ident().html().oneOf(['div'])
    .span('>')
    .span('body', 'html').rawUntil('</')
    .span('</')
    .span('closingTag', 'div').ident().html()
    .span('>')
    .render('ast', { type: 'html', tag: $.tag, text: $.body, closingTag: $.closingTag })
    .build();

  const viaRelation = relation('MarkdownLeaf', {
    input: '<div>html</div>',
    encodings: {
      md: parse([
        literal('<'),
        span('tag', 'div').ident().html().oneOf(['div']),
        literal('>'),
        span('body', 'html').rawUntil('</'),
        literal('</'),
        span('closingTag', 'div').ident().html(),
        literal('>'),
      ]),
      ast: { type: 'html', tag: $.tag, text: $.body, closingTag: $.closingTag },
    },
  });

  assert.deepEqual(viaRelation, viaEx);
});

test('IR equivalence: indent modifier (yaml-block style)', () => {
  const viaEx = ex(' inner').as('Block')
    .span('children', 'inner', 'Item').indent().repeats({ min: 0 })
    .render('ast', { children: $.children })
    .build();

  const viaRelation = relation('Block', {
    input: ' inner',
    encodings: {
      src: parse([
        span('children', 'inner').of('Item').indent().repeats({ min: 0 }),
      ]),
      ast: { children: $.children },
    },
  });

  assert.deepEqual(viaRelation, viaEx);
});
```

- [ ] **Step 3: Run the harness**

Run: `npm run test -w "@parser2/parser" 2>&1 | grep -E "(IR equivalence|spike:|^# (tests|pass|fail))"`
Expected: all 7 IR-equivalence tests pass; spike tests still pass; total parser tests ≥ 72.

- [ ] **Step 4: Commit**

```bash
git add packages/parser/test/relation-ir-equivalence.test.ts
git commit -m "test(parser): IR-equivalence harness for relation() vs ex() (Task 9.3)"
```

---

## Task 9.4 — Public-API rename: `type` → `target`

**Goal:** Rename `options.type` to `options.target` in the generated public API (`render(...)`, `stringify(...)`). This is a deliberate one-time change; generated parsers WILL change. Establishes a new byte-baseline for Tasks 9.5–9.9.

**Files:**
- Modify: `packages/compiler/src/emit/render.ts:368-369`
- Modify: `packages/compiler/src/emit/inverse.ts:904-905`
- Modify: `packages/compiler/src/emit/bytecode/index.ts:96-97, 105-106`
- Modify: `packages/compiler/src/fuzz/runner.ts:40, 138, 199, 226, 242`
- Modify: ~33 test call sites across `packages/{css,html,markdown,cron,yaml-block}/test/`
- Modify: comment in `packages/compiler/src/emit/bytecode/ops.ts:134` (refers to `{ type: 'cron', ... }` — that's an AST shape, NOT the option name — DO NOT change)

- [ ] **Step 1: Inventory all call sites**

Run: `grep -rn "options?.type\|options?: { type" packages/compiler/src/emit/ packages/compiler/src/fuzz/`
Expected output mirrors File map above — confirm the list matches before edits.

Run: `grep -rn "render(.*, { type:" packages/{css,html,markdown,cron,yaml-block}/test/ packages/compiler/test/ | wc -l`
Expected: a positive count (~33+). Note total for the post-rename verification.

- [ ] **Step 2: Edit compiler emit templates**

Edit `packages/compiler/src/emit/render.ts:368-369`:

```ts
// Before:
return `export function render(input: string, options?: { type?: string; mode?: ParseMode }): unknown {
  const target = options?.type ?? __defaultTarget;
// After:
return `export function render(input: string, options?: { target?: string; mode?: ParseMode }): unknown {
  const target = options?.target ?? __defaultTarget;
```

Edit `packages/compiler/src/emit/inverse.ts:904-905`:

```ts
// Before:
return `export function stringify(value: unknown, options?: { type?: string }): string {
  const target = options?.type ?? __defaultTarget;
// After:
return `export function stringify(value: unknown, options?: { target?: string }): string {
  const target = options?.target ?? __defaultTarget;
```

Edit `packages/compiler/src/emit/bytecode/index.ts:96-97, 105-106` analogously (both `render` and `stringify` template strings).

- [ ] **Step 3: Edit fuzz runner**

Edit `packages/compiler/src/fuzz/runner.ts`:

```ts
// Line 40 — signature
- options?: { type?: string },
+ options?: { target?: string },

// Lines 138, 199, 226, 242 — call sites
- render(input, { type: 'ast' });
+ render(input, { target: 'ast' });
- render(input, { type: target });
+ render(input, { target });
// (and analogous on 226, 242)
```

- [ ] **Step 4: Build the compiler — verify no TypeScript errors**

Run: `npm run build -w "@parser2/compiler" 2>&1 | tail -10`
Expected: compiles cleanly.

- [ ] **Step 5: Regenerate every in-scope parser**

Run:
```bash
for pkg in css html markdown cron yaml-block; do
  npm run generate -w "@parser2/$pkg"
done
```
Expected: each regen prints success. The 5 `_generated/parser.ts` files now have the new option-name surface.

Verify the rename landed:
```bash
grep -c "options?: { target?" packages/{css,html,markdown,cron,yaml-block}/src/_generated/parser.ts
```
Expected: each file shows count `2` (render + stringify exports).

- [ ] **Step 6: Migrate every test call site**

For each of the ~33 test files identified in Step 1, replace `{ type:` with `{ target:` ONLY in `render(...)` / `stringify(...)` / `parse(...)` call positions (NOT in AST shape literals like `{ type: 'decl', prop: ... }` — those are data, not options).

Use this codemod approach for safety:

```bash
# Show every match in context before any edit
grep -rn ", { type: '" packages/{css,html,markdown,cron,yaml-block}/test/
```

Then edit each file with `Edit` tool, replacing the option-form only. For files where the match count is unambiguous (e.g. `smoke.test.ts` has `render(input, { type: 'ast' })` only as an API call), `replace_all: true` is safe.

- [ ] **Step 7: Run all in-scope test suites**

```bash
for pkg in parser compiler css html markdown cron yaml-block; do
  echo "=== $pkg ==="
  npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '
  echo
done
```
Expected (after Task 9.3): parser ≥ 72, compiler 372, css 56+1 skip, html 34, markdown 76, cron 15, yaml-block 9. All pass.

- [ ] **Step 8: Snapshot the new byte-baseline**

```bash
mkdir -p /tmp/p9-baseline
for pkg in css html markdown cron yaml-block; do
  sha256sum "packages/$pkg/src/_generated/parser.ts" > "/tmp/p9-baseline/$pkg.sha256"
done
cat /tmp/p9-baseline/*.sha256
```

This baseline anchors the SHA256 gates in Tasks 9.5–9.9.

- [ ] **Step 9: Commit**

```bash
git add -u packages/compiler/src packages/compiler/src/fuzz packages/{css,html,markdown,cron,yaml-block}/src/_generated packages/{css,html,markdown,cron,yaml-block}/test
git commit -m "refactor(api): rename render/stringify option 'type' to 'target' (Task 9.4)"
```

---

## Task 9.5 — Rewrite `cron` schema onto `relation(...)`

**Goal:** Smallest in-scope schema — best first rewrite target. Generated parser bytes must match the post-9.4 baseline.

**Files:**
- Modify: `packages/cron/src/schema.ts`
- Regen: `packages/cron/src/_generated/parser.ts`

- [ ] **Step 1: Read the current schema**

Read `packages/cron/src/schema.ts`. Inventory: 78 lines, single root `Cron` node type, count of `ex(...).build()` calls = (run `grep -c "ex(" packages/cron/src/schema.ts`).

- [ ] **Step 2: Rewrite, one production at a time**

For each `ex(...).as(...).span(...).span(...).render(...).build()` in `packages/cron/src/schema.ts`, replace with the equivalent `relation(...)` form. Mechanical translation:

| Old | New |
|---|---|
| `ex('minute hour day month dow')` | (becomes the `input:` field) |
| `.as('Cron')` | (becomes the first arg to `relation(...)`) |
| `.span('minute', '0').number().int()` | inside `parse([ span('minute', '0').number().int(), ... ])` |
| `.span(' ')` | inside `parse([ ..., literal(' '), ... ])` |
| `.render('ast', { ... })` | `ast: { ... }` in encodings |
| `.render('source', tpl\`...\`)` | `source: tpl\`...\`` in encodings |
| `.build()` | implicit (relation() returns ExampleDef) |

The forward `parse([...])` slot key is `source` for cron (the input format IS the source string — the schema author picks the conventional name).

Example translation (one production):

```ts
// Before:
ex('0 0 * * 0')
  .as('Cron')
  .span('minute', '0').number().int()
  .span(' ')
  .span('hour', '0').number().int()
  .span(' ')
  .span('dom', '*')
  .span(' ')
  .span('month', '*')
  .span(' ')
  .span('dow', '0').number().int()
  .render('ast', { minute: $.minute, hour: $.hour, dom: $.dom, month: $.month, dow: $.dow })
  .render('source', tpl`${$.minute} ${$.hour} ${$.dom} ${$.month} ${$.dow}`)
  .build()

// After:
relation('Cron', {
  input: '0 0 * * 0',
  encodings: {
    source: parse([
      span('minute', '0').number().int(),
      span('hour', '0').number().int(),
      span('dom', '*'),     // named span — stays span(), not literal()
      span('month', '*'),   // ditto
      span('dow', '0').number().int(),
    ]),
    ast: { minute: $.minute, hour: $.hour, dom: $.dom, month: $.month, dow: $.dow },
  },
})
```

Note: the literal spaces between fields ARE captured by the default whitespace policy — no `literal(' ')` entries needed. If the original `ex()` used `.span(' ')` explicitly (forcing a literal-space token), translate to `literal(' ')` — but cron's schema uses whitespace policy, not explicit spaces. Reading the current schema in Step 1 will disambiguate.

⚠️ Be careful: when the original `.span('text-with-name', '...')` declared a named span WITHOUT a class chain (defaulting to class='literal'), do NOT translate to `literal(...)` — keep `span('name', 'text-with-name')` so the captured name persists. `literal(...)` only replaces UNNAMED literal spans (e.g. `.span(':')` becomes `literal(':')`; `.span('prop', 'color')` stays `span('prop', 'color')`).

- [ ] **Step 3: Update imports**

```ts
// Before:
import { $, defineSchema, ex, tpl } from '@parser2/parser';
// After:
import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';
```

- [ ] **Step 4: Regenerate the cron parser**

Run: `npm run generate -w "@parser2/cron"`
Expected: success.

- [ ] **Step 5: SHA256 gate — assert bytes match the post-9.4 baseline**

Run:
```bash
sha256sum packages/cron/src/_generated/parser.ts | diff - /tmp/p9-baseline/cron.sha256
```
Expected: empty diff. If non-empty, the schema rewrite is NOT mechanically equivalent — debug and revise the rewrite (do not update the baseline).

- [ ] **Step 6: Run cron tests**

Run: `npm run test -w "@parser2/cron" 2>&1 | tail -5`
Expected: `# tests 15 # pass 15 # fail 0`.

- [ ] **Step 7: Run parser + compiler tests (catch upstream regressions)**

Run: `npm run test -w "@parser2/parser" -w "@parser2/compiler" 2>&1 | grep -E "^# (tests|pass|fail)"`
Expected: all pass at counts unchanged from after Task 9.4.

- [ ] **Step 8: Commit**

```bash
git add packages/cron/src/schema.ts packages/cron/src/_generated/parser.ts
git commit -m "refactor(cron): rewrite schema onto relation() DSL (Task 9.5)"
```

---

## Task 9.6 — Rewrite `yaml-block` schema

**Goal:** Same mechanical rewrite as Task 9.5. Exercises `.indent()` modifier translation.

**Files:**
- Modify: `packages/yaml-block/src/schema.ts`
- Regen: `packages/yaml-block/src/_generated/parser.ts`

- [ ] **Step 1: Apply the Task 9.5 mechanical translation to `packages/yaml-block/src/schema.ts`**

Follow the same rules. The yaml-block schema uses `.indent()` and `.repeats()` — both translate unchanged via `.of(roles)` / `.indent()` / `.repeats(...)` on the new `span(...)` chain.

- [ ] **Step 2: Update imports**

```ts
import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';
```

- [ ] **Step 3: Regenerate**

Run: `npm run generate -w "@parser2/yaml-block"`

- [ ] **Step 4: SHA256 gate**

```bash
sha256sum packages/yaml-block/src/_generated/parser.ts | diff - /tmp/p9-baseline/yaml-block.sha256
```
Expected: empty diff.

- [ ] **Step 5: Run yaml-block tests**

Run: `npm run test -w "@parser2/yaml-block" 2>&1 | tail -5`
Expected: `# tests 9 # pass 9`.

- [ ] **Step 6: Commit**

```bash
git add packages/yaml-block/src/schema.ts packages/yaml-block/src/_generated/parser.ts
git commit -m "refactor(yaml-block): rewrite schema onto relation() DSL (Task 9.6)"
```

---

## Task 9.7 — Rewrite `markdown` schema

**Files:**
- Modify: `packages/markdown/src/schema.ts` (649 lines, ~28 ex() productions)
- Regen: `packages/markdown/src/_generated/parser.ts`

- [ ] **Step 1: Apply the Task 9.5 mechanical translation**

Each `ex(...).as('MarkdownLeaf')` becomes a separate `relation('MarkdownLeaf', { input, encodings })`. The `MarkdownDocument` and `MarkdownParagraph` cases follow the same rule. The forward parse-program slot key is `md` (the convention chosen during brainstorming).

For productions using `.until(HEADING_LINE_STOPS, { balanced: false })`, `.rawUntil('</')`, `.optional()`, etc., the new chain mirrors the old span method names verbatim.

For `.span('children', '...', ['MarkdownLeaf', 'MarkdownParagraph'])`, translate to `span('children', '...').of('MarkdownLeaf', 'MarkdownParagraph')`.

- [ ] **Step 2: Update imports**

```ts
import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';
```

- [ ] **Step 3: Regenerate**

Run: `npm run generate -w "@parser2/markdown"`

- [ ] **Step 4: SHA256 gate**

```bash
sha256sum packages/markdown/src/_generated/parser.ts | diff - /tmp/p9-baseline/markdown.sha256
```
Expected: empty diff.

- [ ] **Step 5: Run markdown tests**

Run: `npm run test -w "@parser2/markdown" 2>&1 | tail -5`
Expected: `# tests 76 # pass 76`.

- [ ] **Step 6: Commit**

```bash
git add packages/markdown/src/schema.ts packages/markdown/src/_generated/parser.ts
git commit -m "refactor(markdown): rewrite schema onto relation() DSL (Task 9.7)"
```

---

## Task 9.8 — Rewrite `html` schema (with Phase 8 `caseSensitive: false`)

**Files:**
- Modify: `packages/html/src/schema.ts` (645 lines)
- Regen: `packages/html/src/_generated/parser.ts`

- [ ] **Step 1: Apply the mechanical translation**

The `caseSensitive: false` schema-level dial stays at `defineSchema(...)`; the per-relation rewrite doesn't touch it. Use the same translation rules as Task 9.5.

- [ ] **Step 2: Update imports**

```ts
import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';
```

- [ ] **Step 3: Regenerate**

Run: `npm run generate -w "@parser2/html"`

- [ ] **Step 4: SHA256 gate**

```bash
sha256sum packages/html/src/_generated/parser.ts | diff - /tmp/p9-baseline/html.sha256
```
Expected: empty diff.

- [ ] **Step 5: Run html tests**

Run: `npm run test -w "@parser2/html" 2>&1 | tail -5`
Expected: `# tests 34 # pass 34`.

- [ ] **Step 6: Commit**

```bash
git add packages/html/src/schema.ts packages/html/src/_generated/parser.ts
git commit -m "refactor(html): rewrite schema onto relation() DSL (Task 9.8)"
```

---

## Task 9.9 — Rewrite `css` schema

**Goal:** Largest in-scope schema — the comprehensive test of the rewrite mechanism. CSS exercises operator layers, validators, repeats with separators, and the raws mode.

**Files:**
- Modify: `packages/css/src/schema.ts` (381 lines)
- Regen: `packages/css/src/_generated/parser.ts`

- [ ] **Step 1: Apply the mechanical translation**

Same rules. CSS schemas use `.repeats({ sep: ';', trailing: 'allowed' })` heavily — translate unchanged. The `operators` and `punctuators` declarations on `defineSchema(...)` are untouched.

- [ ] **Step 2: Update imports**

```ts
import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';
```

- [ ] **Step 3: Regenerate**

Run: `npm run generate -w "@parser2/css"`

- [ ] **Step 4: SHA256 gate**

```bash
sha256sum packages/css/src/_generated/parser.ts | diff - /tmp/p9-baseline/css.sha256
```
Expected: empty diff.

- [ ] **Step 5: Run css tests**

Run: `npm run test -w "@parser2/css" 2>&1 | tail -5`
Expected: `# tests 57 # pass 56 # skipped 1`.

- [ ] **Step 6: Optional bench-parity check**

Run: `npm run bench -w "@parser2/css" 2>&1 | tail -20` (if the script exists).
Compare against the committed `packages/css/bench/perf-baseline.json`. No hz regression expected.

- [ ] **Step 7: Commit**

```bash
git add packages/css/src/schema.ts packages/css/src/_generated/parser.ts
git commit -m "refactor(css): rewrite schema onto relation() DSL (Task 9.9)"
```

---

## Task 9.10 — Delete `ex()` builder

**Goal:** Remove the old DSL entirely once all in-scope schemas are off it.

**Files:**
- Delete: `packages/parser/src/example.ts`
- Modify: `packages/parser/src/index.ts` (remove `ex` export and dependent type re-exports)
- Modify: `packages/parser/test/parser.test.ts` (remove tests that imported `ex`)

- [ ] **Step 1: Confirm no in-scope code references `ex`**

Run:
```bash
grep -rn "from '@parser2/parser'" packages/{css,html,markdown,cron,yaml-block}/src/ | grep "\bex\b"
grep -rn ", ex," packages/{css,html,markdown,cron,yaml-block}/src/
grep -rn " ex," packages/{css,html,markdown,cron,yaml-block}/src/
```
Expected: empty output. If any remain, return to the corresponding Task 9.5–9.9 and finish the rewrite.

- [ ] **Step 2: Remove `ex` export from `packages/parser/src/index.ts`**

Edit `packages/parser/src/index.ts`:

```ts
// Before:
export { ex } from './example.ts';
// After: (remove the line)
```

Also remove any `ExampleBuilder`, `SpanBuilder` type re-exports if they exist. The `ExampleDef`, `SpanDef`, etc. type re-exports STAY — they're consumed by the compiler.

- [ ] **Step 3: Delete `packages/parser/src/example.ts`**

```bash
rm packages/parser/src/example.ts
```

- [ ] **Step 4: Remove ex-coupled tests from `packages/parser/test/parser.test.ts`**

Identify and delete every test that imports `ex` — they're now covered by `relation.test.ts` and `relation-ir-equivalence.test.ts`.

- [ ] **Step 5: Build the parser package**

Run: `npm run build -w "@parser2/parser" 2>&1 | tail -10`
Expected: TypeScript compiles cleanly.

- [ ] **Step 6: Run all in-scope tests**

```bash
for pkg in parser compiler css html markdown cron yaml-block; do
  echo "=== $pkg ==="
  npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '
  echo
done
```
Expected: every suite still green. Parser test count drops by the number of `ex`-coupled tests removed; total `# pass` should equal `# tests` for every package.

- [ ] **Step 7: Commit**

```bash
git add -u packages/parser/src/index.ts packages/parser/test/parser.test.ts
git add packages/parser/src/  # picks up the example.ts deletion
git commit -m "refactor(parser): delete ex() builder; relation() is now the only DSL (Task 9.10)"
```

---

## Task 9.11 — Delete 8 out-of-scope packages

**Goal:** Per master plan, packages stuck on the old DSL since at least Phase 6 are deleted, not rewritten.

**Files:**
- Delete: `packages/arn`, `packages/js`, `packages/log`, `packages/mac`, `packages/proto`, `packages/url`, `packages/css-color`, `packages/css-length-percentage`
- Modify (possibly): the root `package.json` workspaces array — verify no enumeration of the 8 packages remains

- [ ] **Step 1: Verify the workspaces list uses a glob, not enumeration**

Run: `grep -A 5 '"workspaces"' package.json`
If it shows `"packages/*"` or similar, no edit needed — package directories are auto-discovered. If it enumerates specific package names, identify entries to remove for the 8 packages above.

- [ ] **Step 2: Delete each package directory**

```bash
for pkg in arn js log mac proto url css-color css-length-percentage; do
  if [ -d "packages/$pkg" ]; then
    rm -rf "packages/$pkg"
    echo "deleted packages/$pkg"
  else
    echo "skipped packages/$pkg (not present)"
  fi
done
```

- [ ] **Step 3: Run `npm install` to rebuild workspace lockfile**

Run: `npm install 2>&1 | tail -10`
Expected: success. Lockfile drops the 8 packages.

- [ ] **Step 4: Run all in-scope tests once more**

```bash
for pkg in parser compiler css html markdown cron yaml-block; do
  echo "=== $pkg ==="
  npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '
  echo
done
```
Expected: all green. Deletion of out-of-scope packages must not affect in-scope tests (no cross-package imports existed).

- [ ] **Step 5: Commit**

```bash
git add -u package-lock.json package.json
git add -A  # picks up directory deletions
git commit -m "chore: delete 8 out-of-scope packages (arn, js, log, mac, proto, url, css-color, css-length-percentage) (Task 9.11)"
```

---

## Task 9.12 — Doc closeout

**Goal:** Lock the Phase 9 closeout: status doc, master-plan marker, follow-up inventory, and final state verification.

**Files:**
- Modify: `docs/v2-migration-status.md` (append Phase 9 closeout section)
- Modify: `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md:797-840` (mark Phase 9 CLOSED)
- Delete: `packages/parser/test/spike-relation.test.ts` (superseded by `relation-ir-equivalence.test.ts`)

- [ ] **Step 1: Delete the spike test (it's now duplicated by Task 9.3's harness)**

```bash
rm packages/parser/test/spike-relation.test.ts
```

- [ ] **Step 2: Run parser tests once more to confirm no regression**

Run: `npm run test -w "@parser2/parser" 2>&1 | tail -5`
Expected: total count drops by 4 (spike's 4 tests are now in the IR-equivalence harness with the same assertions). All green.

- [ ] **Step 3: Append Phase 9 closeout to `docs/v2-migration-status.md`**

Append a new section after the Phase 8 closeout (around line 505+):

```markdown
## Phase 9 closeout (2026-MM-DD)

12 commits, final SHA `<sha>`. The bidirectional-engine overhaul is complete.

### What landed (Phase 9)

| Task | Commit | Description |
|---|---|---|
| 9.1 | `<sha>` | feat(parser): introduce relation() DSL alongside ex() |
| 9.2 | `<sha>` | feat(parser): relation() cross-validates input vs parse program |
| 9.3 | `<sha>` | test(parser): IR-equivalence harness for relation() vs ex() |
| 9.4 | `<sha>` | refactor(api): rename render/stringify option 'type' to 'target' |
| 9.5 | `<sha>` | refactor(cron): rewrite schema onto relation() DSL |
| 9.6 | `<sha>` | refactor(yaml-block): rewrite schema onto relation() DSL |
| 9.7 | `<sha>` | refactor(markdown): rewrite schema onto relation() DSL |
| 9.8 | `<sha>` | refactor(html): rewrite schema onto relation() DSL |
| 9.9 | `<sha>` | refactor(css): rewrite schema onto relation() DSL |
| 9.10 | `<sha>` | refactor(parser): delete ex() builder; relation() is now the only DSL |
| 9.11 | `<sha>` | chore: delete 8 out-of-scope packages |
| 9.12 | `<sha>` | docs: Phase 9 closeout (this task) |

### Final state

- parser: <count>/<count> ✅
- compiler: 372/372 ✅
- css: 56/57 (1 intentional skip) ✅
- html: 34/34 ✅
- markdown: 76/76 ✅
- cron: 15/15 ✅
- yaml-block: 9/9 ✅

### Phase 9 follow-ups (deferrable)

1. (placeholder — fill with any deferrals surfaced during Task 9.5–9.9 reviews)

### Bidirectional-engine overhaul — overall closeout

All 9 phases complete. The engine is proven; the DSL is uniform; the in-scope packages (css, html, markdown, cron, yaml-block) are the supported surface. The 8 out-of-scope packages have been removed.
```

Fill the `<sha>` placeholders by running `git log --oneline -12` after Step 4 (the commit for this very task is added at Step 6).

- [ ] **Step 4: Update master plan Phase 9 status**

Edit `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md` lines 797–840. After line 840 (the exit-gate paragraph), insert:

```markdown
**Status: CLOSED (2026-MM-DD).** See `docs/v2-migration-status.md` § "Phase 9 closeout" and `docs/superpowers/plans/2026-05-30-phase-9-relation-dsl.md` for the executed task breakdown.
```

(Same pattern as the Phase 8 status line at line 797 of the same file.)

- [ ] **Step 5: Verify the entire workspace**

Run:
```bash
for pkg in parser compiler css html markdown cron yaml-block; do
  echo -n "$pkg: "
  npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '
  echo
done
```

Expected: every package green at its expected count.

- [ ] **Step 6: Final commit**

```bash
git add docs/v2-migration-status.md docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md
git add packages/parser/test/  # picks up spike test deletion
git commit -m "docs: Phase 9 relation() DSL closeout (Task 9.12)"
```

---

## Final state verification (after Task 9.12)

```bash
git log --oneline | head -15
git status                          # clean — no uncommitted changes
git stash list                      # empty
ls packages/                        # exactly 8 entries: parser, compiler, css, html, markdown, cron, yaml-block, plus tooling dirs
grep -rn "from './example.ts'" packages/parser/src/  # empty
grep -rn "\bex\b" packages/{css,html,markdown,cron,yaml-block}/src/  # empty
```

All gates green; the bidirectional-engine overhaul is complete.

---

## Self-review notes

- **Spec coverage:** Each section of `docs/superpowers/specs/2026-05-30-phase-9-relation-dsl-design.md` is covered:
  - Public API surface → Task 9.1 (new constructors) + Task 9.4 (target rename)
  - IR translation → Task 9.1 (relation() mechanically builds ExampleDef) + Task 9.2 (cross-validation) + Task 9.3 (equivalence harness)
  - Worked examples → Task 9.5–9.9 (each rewrite)
  - Testing strategy & exit gates → SHA256 gate enforced per package + bench check (Task 9.9)
  - Out-of-scope packages → Task 9.11
- **Type consistency:** `relation` / `parse` / `span` / `literal` signatures consistent across Tasks 9.1, 9.2, 9.3, and the rewrite tasks. `.of(roles)` is varargs in every reference. Encoding slot names (`md`, `source`, etc.) are author-chosen — no fixed convention enforced.
- **Placeholder scan:** No "TBD" / "TODO". `<sha>` placeholders in Task 9.12 closeout doc are deliberate — they're commit hashes the executor fills in after each commit; the surrounding instruction tells them how.
- **Plan deviation expected:** Tasks 9.5–9.9 may surface schemas where the mechanical translation produces a different `ExampleDef` (and thus different parser bytes). Document each deviation in the commit message, then either (a) refine the translation pattern in `relation.ts` to absorb the case, or (b) accept the byte change and update the baseline. Both paths are explicit; choose based on what preserves the engine invariants.
