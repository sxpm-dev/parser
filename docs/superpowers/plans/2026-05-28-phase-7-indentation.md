# Phase 7 — Indentation primitive (`.indent`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a span-level `.indent` primitive that lets schemas describe column-significant constructs (YAML block sequences/mappings, Python blocks, Pug, indented Markdown lists). After this phase, adding a YAML-block schema requires only writing `packages/yaml-block/src/schema.ts`; no engine changes.

**Architecture:** Implemented as a new `SpanModifier` variant — `{ kind: 'indent' }` — attached to a recursive-repeats span. The runtime carries a small `indentStack: number[]` of expected column offsets. On entry to an indented repeats span, the first child's column is captured and pushed; each subsequent iteration must begin at that column; the loop exits when the next non-blank line starts at a smaller column. The reference interpreter (`packages/compiler/src/interp/parse.ts`), the v2 TS emitter (`packages/compiler/src/emit/v2/`), and the inverse stringifier (`packages/compiler/src/interp/stringify.ts` + emitter template-form inverse) all gain matching support. Bytecode backend NOT touched (Phase 6 left it bound to cron only — see follow-up #7 in `docs/v2-migration-status.md`).

**Tech Stack:** TypeScript 5.x (Node 20+), tsx for codegen, `node:test` for regressions. No new dependencies.

---

## Decision locked at plan-start: modifier vs IR primitive

**Choice: modifier.** `SpanModifier` gains a single new variant `{ kind: 'indent' }`. The handoff doc lays out the trade-off (handoff §"What's left" → Phase 7); the modifier path is chosen because:

1. **Less invasive.** All existing span infrastructure (recursive roles, repeats loop, render dispatch, stringify dispatch) already threads `SpanModifier`s. Adding one more `kind` requires touching the runtime + emitter + interp; introducing an `IndentScope` IR primitive would have rippled through every layer that walks `ResolvedSpan` / `Production`.
2. **Indent semantics co-locate with repeats.** Every real use case is "an indented block of repeated children" — `.span('children', '', ['YamlListItem']).indent().repeats({ min: 0 })`. The modifier sits at the right scope.
3. **Reversible.** If the YAML/Pug exit gate later forces explicit scope objects (e.g. nested indents that don't repeat), Phase 7's `kind: 'indent'` becomes the obvious migration target — same data, promoted to a richer shape.

If during Task 7.7 the chosen exit-gate schema cannot be expressed with the modifier (e.g. Pug attribute blocks have indent semantics without repeats), STOP and reassess before forcing a workaround. Document the wall in a follow-up; do not silently promote to an IR primitive without re-planning.

---

## Pre-flight: working directory + baseline

Working directory: `/Users/valerii/Develop/parser3_codex` (main branch). Phase 7 may optionally use a worktree under `.claude/worktrees/phase-7-indent` — recommended if you want isolation from main, not required. The Phase 6 worktree at `.claude/worktrees/engine+v2-and-theorems` can be removed first (handoff doc § "Worktree cleanup"):

```bash
git worktree remove .claude/worktrees/engine+v2-and-theorems
git branch -d worktree-engine+v2-and-theorems
```

Verify baseline (last known good after Phase 6 closeout, 2026-05-27):

```bash
for pkg in parser compiler css html markdown cron; do
  echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo
done
```

Expected: parser 25/25, compiler 322/322, css 56/57 (1 skip), html 30/30, markdown 76/76, cron 15/15.

If you see a compiler perf-budget flake (`bytecode-budget.test.ts`), re-run once — it uses wall-clock timing and occasionally trips under load.

---

## Scope decisions

1. **Modifier kind, not IR primitive.** Locked above.
2. **Indent mode: "any greater".** The MVP supports a single mode: the indented block's column is whatever column the first child appears at, as long as it's strictly greater than the parent's indent (top-level parent = column 0). No "exact delta" mode (Python's strict indent rules) and no "multiple of N" (CoffeeScript) — both can be added later without breaking the modifier's data shape.
3. **Stack depth.** Fixed-size `Int32Array(16)` allocated once per parse. 16 levels is enough for every real YAML/Pug document; exceeding it is a syntax error. Avoids allocation overhead for the common case (1-3 levels).
4. **Whitespace.** Only ASCII space (0x20) counts toward indent. Tabs are not supported in the MVP — schemas that mix tabs and spaces are outside Phase 7's scope. Document in `packages/parser/src/types.ts` JSDoc.
5. **Blank lines.** Lines containing only whitespace (incl. `\n`) inside an indented block are skipped; they do not terminate the block.
6. **Exit-gate schema.** `packages/yaml-block` — a small block-sequence + block-mapping YAML subset. Specifically: bare `key: value` mappings, `- item` sequences, and arbitrarily nested combinations of the two. Flow style (`{a: 1}`, `[1,2]`), folded scalars, anchors/aliases, tags, and quoted strings are out of scope. 50 lines of representative input must parse through (a) v2 TS backend, (b) reference interpreter, and (c) round-trip theorem.
7. **Bytecode backend stays untouched.** Cron remains the only bytecode-tested schema. Adding indent to the bytecode encoder/runtime is a follow-up.

---

## File-touch map

**New files:**
- `packages/parser/test/indent.test.ts` — DSL surface + builder snapshot.
- `packages/compiler/test/indent-interp.test.ts` — reference-interpreter end-to-end on a tiny YAML-list inline schema.
- `packages/compiler/test/indent-emit.test.ts` — v2 TS backend end-to-end on the same inline schema.
- `packages/yaml-block/package.json`
- `packages/yaml-block/tsconfig.json`
- `packages/yaml-block/src/schema.ts`
- `packages/yaml-block/src/index.ts`
- `packages/yaml-block/test/yaml-block.test.ts`
- `packages/yaml-block/test/round-trip.test.ts`

**Modified files:**
- `packages/parser/src/types.ts` — add `{ kind: 'indent' }` variant to `SpanModifier`.
- `packages/parser/src/example.ts` — add `.indent()` method on `SpanBuilder`; add `.indent(name, roles)` sugar on `ExampleBuilder`.
- `packages/parser/src/index.ts` — export anything new (none expected; `SpanModifier` is already exported).
- `packages/compiler/src/interp/parse.ts` — handle indent in the recursive-repeats parse path.
- `packages/compiler/src/interp/stringify.ts` — emit indent on inverse-template render for indent-modified spans.
- `packages/compiler/src/emit/v2/runtime.ts` — add `indentStack` to `State`; add `pushIndent` / `popIndent` / `requireIndentCol` helpers to `V2_RUNTIME` string.
- `packages/compiler/src/emit/v2/span.ts` — `emitRepeatsSpan` emits indent-aware loop wrapper when the span carries `kind: 'indent'`.
- `packages/compiler/src/emit/render.ts` (or wherever template-form inverse render is emitted — verify before editing; in the current tree it lives in `packages/compiler/src/emit/render.ts` and `packages/compiler/src/emit/inverse.ts` if present) — emit indent column for indent-modified slots in template-form `source` render.
- `packages/compiler/src/check/round-trip.ts` — no API change expected; verify it still works against indent schemas. If `interp/stringify.ts` produces the right output, the existing round-trip harness will exercise indent without modification.
- `docs/v2-migration-status.md` — Phase 7 closeout (Task 7.8).
- `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md` — Phase 7 marked closed (Task 7.8).
- Root `package.json` workspaces array — `packages/yaml-block` added (Task 7.7).

**Out-of-scope (do not touch):**
- `packages/compiler/src/emit/bytecode/**` — bytecode backend stays bound to cron.
- `packages/{arn,js,log,mac,proto,url,css-color,css-length-percentage}` — out-of-scope packages.
- `packages/cron` — Phase 6 exit gate, not exercised by Phase 7.

---

## Task 7.1: SpanModifier `kind: 'indent'` + DSL surface

**Why first:** Every later task depends on the modifier existing in the type system and being constructible from the builder. Pure data-shape change; no behavior yet.

**Files:**
- Modify: `packages/parser/src/types.ts`
- Modify: `packages/parser/src/example.ts`
- Test: `packages/parser/test/indent.test.ts`

- [ ] **Step 1: Failing test.** Create `packages/parser/test/indent.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { ex } from '../src/example.ts';
import type { SpanModifier } from '../src/types.ts';

test('indent: SpanBuilder.indent() appends kind:indent modifier', () => {
  const example = ex('- a')
    .as('YamlList')
    .span('children', '', ['YamlItem']).indent().repeats({ min: 0 })
    .build();
  const span = example.spans[0]!;
  const indentMod = span.modifiers.find((m: SpanModifier) => m.kind === 'indent');
  assert.ok(indentMod, 'expected an indent modifier on the recursive-repeats span');
  assert.equal(indentMod.kind, 'indent');
});

test('indent: ExampleBuilder.indent(name, roles) sugar creates an indented recursive span', () => {
  const example = ex('- a')
    .as('YamlList')
    .indent('children', ['YamlItem']).repeats({ min: 0 })
    .build();
  const span = example.spans[0]!;
  assert.equal(span.name, 'children');
  assert.deepEqual([...span.recursiveRoles], ['YamlItem']);
  assert.ok(span.modifiers.find((m: SpanModifier) => m.kind === 'indent'),
    'sugar form must install the indent modifier');
  assert.ok(span.modifiers.find((m: SpanModifier) => m.kind === 'repeats'),
    '.repeats() must still chain after the sugar form');
});

test('indent: modifier order preserved — indent before repeats', () => {
  const example = ex('- a')
    .as('YamlList')
    .span('children', '', ['YamlItem']).indent().repeats({ min: 0 })
    .build();
  const kinds = example.spans[0]!.modifiers.map((m) => m.kind);
  assert.deepEqual(kinds, ['indent', 'repeats']);
});
```

- [ ] **Step 2: Run test to verify it fails.**

Run: `npm run test -w @parser2/parser 2>&1 | grep -E "indent|^# "`
Expected: 3 indent tests FAIL — `indent is not a function on SpanBuilder` (or similar).

- [ ] **Step 3: Add the `indent` modifier variant to `SpanModifier`.** In `packages/parser/src/types.ts`, after the `requireSpaceAfter` variant inside the `SpanModifier` union, add:

```ts
  | {
      // Column-significant indent scope. Used on a recursive-repeats span to
      // mark the block as indented relative to the surrounding production.
      //
      // Semantics (MVP — see docs/superpowers/plans/2026-05-28-phase-7-indentation.md
      // for the full design):
      //   - On entry to the indented repeats loop, the column where the FIRST
      //     child begins is captured and pushed onto state.indentStack.
      //   - Each subsequent iteration must begin at that same column (after
      //     consuming any number of blank or whitespace-only lines).
      //   - The loop exits cleanly when the next non-blank line starts at a
      //     strictly smaller column (dedent).
      //   - Only ASCII space (0x20) counts toward the indent column; tabs are
      //     not supported.
      //   - Maximum stack depth is 16 (`Int32Array(16)`); deeper nesting is a
      //     syntax error.
      readonly kind: 'indent';
    }
```

- [ ] **Step 4: Add `.indent()` method on `SpanBuilder`.** In `packages/parser/src/example.ts`, alongside the existing `noLineTerminatorAfter` / `noWhitespaceAfter` / `requireSpaceAfter` methods on `SpanBuilder`, add:

```ts
  indent(): this {
    return this.addModifier({ kind: 'indent' });
  }
```

- [ ] **Step 5: Add `.indent(name, roles)` sugar on `ExampleBuilder`.** In `packages/parser/src/example.ts`, alongside the existing `.span(...)` method on `ExampleBuilder`, add:

```ts
  // Sugar: equivalent to .span(name, '', roles).indent(). Returns a
  // SpanBuilder so the caller can chain .repeats(...) etc.
  indent(name: string, roles: ReadonlyArray<string>): SpanBuilder {
    const builder = new SpanBuilder(this, name, undefined, roles);
    return builder.indent();
  }
```

Note: the SpanBuilder's `.indent()` is part of the same chain, so the sugar method returns a SpanBuilder whose chain continues normally (`.repeats(...)`, `.span(...)`, `.render(...)`, etc.).

- [ ] **Step 6: Re-export `SpanBuilder.indent` in the chain-continuation block.** The bottom of `SpanBuilder` re-exports `.span(...)` / `.as(...)` / etc. for chain continuation. `.indent()` is a self-modifying method (`return this`) so it does not need re-exporting on `ExampleBuilder` proxy — but verify `.span()` still resolves correctly after `.indent()` is called. No code change expected here; verify by reading lines 211-229 of `packages/parser/src/example.ts`.

- [ ] **Step 7: Run tests to verify they pass.**

Run: `npm run test -w @parser2/parser 2>&1 | grep -E "^# (tests|pass|fail|skipped)"`
Expected: `# tests 28 # pass 28 # fail 0 # skipped 0` (3 new + 25 existing).

- [ ] **Step 8: Verify in-scope packages still build/parse.**

Run: `npm run test -w @parser2/css -w @parser2/html -w @parser2/markdown -w @parser2/compiler 2>&1 | grep -E "^# (tests|pass|fail|skipped)"`
Expected: all green; counts unchanged from baseline.

- [ ] **Step 9: Commit.**

```bash
git add packages/parser/src/types.ts packages/parser/src/example.ts packages/parser/test/indent.test.ts
git commit -m "feat(parser): add SpanModifier kind 'indent' + DSL surface (Task 7.1)"
```

---

## Task 7.2: Reference interpreter handles indent on recursive-repeats

**Why second:** The reference interpreter is the spec. Until it can parse an indent-modified schema, there is nothing for the codegen to match against. Implement it as the trust anchor first; the v2 emitter follows in Task 7.4.

**Files:**
- Modify: `packages/compiler/src/interp/parse.ts`
- Test: `packages/compiler/test/indent-interp.test.ts`

- [ ] **Step 1: Failing test.** Create `packages/compiler/test/indent-interp.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { $, defineSchema, ex, tpl } from '@parser2/parser';
import { inferSchema } from '../src/infer/index.ts';
import { interpretParse } from '../src/interp/index.ts';

const yamlListSchema = defineSchema({
  rootType: 'YamlList',
  examples: [
    ex('- a')
      .as('YamlItem')
      .span('- ')
      .span('value', 'a').until('\n')
      .render('ast', $.value)
      .render('source', tpl`- ${$.value}`)
      .build(),

    ex(`- a
- b`)
      .as('YamlList')
      .indent('items', ['YamlItem']).repeats({ min: 0 })
      .render('ast', { type: 'list', items: $.items })
      .render('source', tpl`${$.items}`)
      .build(),
  ],
});

test('interp: parses two top-level items', () => {
  const schema = inferSchema(yamlListSchema);
  const ast = interpretParse(schema, '- a\n- b\n');
  assert.deepEqual(ast, { type: 'list', items: ['a', 'b'] });
});

test('interp: dedent terminates the repeats loop', () => {
  const schema = inferSchema(yamlListSchema);
  // Trailing line is at column 0 — same level as the top-level list. The
  // top-level list IS at column 0, so it should keep accepting items as long
  // as they stay at column 0. Two items, both at col 0, is a valid parse.
  const ast = interpretParse(schema, '- a\n- b\n');
  assert.deepEqual((ast as { items: string[] }).items.length, 2);
});

test('interp: blank lines inside the indent block are skipped', () => {
  const schema = inferSchema(yamlListSchema);
  const ast = interpretParse(schema, '- a\n\n- b\n');
  assert.deepEqual((ast as { items: string[] }).items, ['a', 'b']);
});
```

- [ ] **Step 2: Run test to verify it fails.**

Run: `npm run test -w @parser2/compiler --silent 2>&1 | grep -E "indent-interp|^# (tests|pass|fail|skipped)"`
Expected: 3 indent-interp tests FAIL (interpreter ignores the indent modifier today, but the schema may still parse a single item; one or more of the asserts will fail).

- [ ] **Step 3: Add `indentStack` to interpreter `State`.** In `packages/compiler/src/interp/parse.ts` near line 33, replace the `State` type:

```ts
type State = {
  readonly input: string;
  readonly len: number;
  pos: number;
  maxOff: number;
  // Stack of expected column offsets for nested indent scopes. Pushed by the
  // recursive-repeats parser when the span carries kind:'indent'; popped on
  // exit. Top of stack = current required column (in chars) for the next
  // child item in an indented block.
  readonly indentStack: number[];
};
```

And in `interpretParse` / `interpretParseCaptures`, update the State initializers:

```ts
const state: State = { input, len: input.length, pos: 0, maxOff: 0, indentStack: [] };
```

- [ ] **Step 4: Identify the recursive-repeats parse path.** Read `packages/compiler/src/interp/parse.ts` and locate the function that handles a span with `recursiveRoles.length > 0 && modifiers.some(m => m.kind === 'repeats')`. Call it `parseRecursiveRepeats` (rename if its current name differs). It already loops, calling `parseNode(role, state)` for each child, accumulating into an array, and breaking when a child returns null.

- [ ] **Step 5: Add column helpers at the top of `interp/parse.ts`** (after the State type, before the entry points):

```ts
// Return the column (0-indexed) of the byte at `pos` within its line.
// Column = number of ASCII spaces (0x20) since the start of the current line.
// Tabs are NOT supported in the MVP — schemas with tabs return non-deterministic
// columns relative to the surrounding text.
function columnAt(state: State, pos: number): number {
  let lineStart = pos;
  while (lineStart > 0 && state.input.charCodeAt(lineStart - 1) !== 0x0a) lineStart--;
  return pos - lineStart;
}

// Skip blank/whitespace-only lines. Advances state.pos past any sequence of
// lines that contain only spaces/tabs followed by a newline. Stops at the
// first non-blank character (without consuming the spaces leading up to it).
function skipBlankLines(state: State): void {
  outer: while (state.pos < state.len) {
    let probe = state.pos;
    while (probe < state.len) {
      const c = state.input.charCodeAt(probe);
      if (c === 0x0a) { state.pos = probe + 1; continue outer; }
      if (c === 0x20 || c === 0x09 || c === 0x0d) { probe++; continue; }
      return;
    }
    // End of input reached while scanning whitespace — leave pos unchanged.
    return;
  }
}
```

- [ ] **Step 6: Wrap the recursive-repeats parse path with indent semantics.** Inside `parseRecursiveRepeats` (or whatever the existing function is named — verify by reading the file), if the span carries an indent modifier, before the loop:

```ts
const isIndented = span.modifiers.some((m) => m.kind === 'indent');
let indentPushed = false;
if (isIndented) {
  // Skip leading whitespace and blank lines on the way in. The first child's
  // column becomes the expected column for every subsequent iteration.
  skipBlankLines(state);
  // Skip horizontal whitespace (spaces only — tabs not supported in MVP).
  while (state.pos < state.len && state.input.charCodeAt(state.pos) === 0x20) state.pos++;
  const firstCol = columnAt(state, state.pos);
  const parentCol = state.indentStack.length > 0 ? state.indentStack[state.indentStack.length - 1]! : -1;
  if (firstCol <= parentCol) {
    // Block is empty (immediate dedent or no greater indent). Honor min via
    // the existing post-loop min check; return empty array now.
    // (Do NOT push indent; nothing was indented.)
  } else {
    state.indentStack.push(firstCol);
    indentPushed = true;
  }
}
```

Inside the loop, BEFORE the role-call, if `isIndented`:

```ts
if (isIndented && indentPushed) {
  // Skip blank lines first.
  skipBlankLines(state);
  // Skip horizontal whitespace.
  while (state.pos < state.len && state.input.charCodeAt(state.pos) === 0x20) state.pos++;
  const col = columnAt(state, state.pos);
  const required = state.indentStack[state.indentStack.length - 1]!;
  if (col < required) break;   // dedent — exit cleanly
  if (col > required) break;   // unexpected over-indent — exit cleanly; parent handles
}
```

After the loop, if `indentPushed`, `state.indentStack.pop();`.

Note: the EXACT placement of the pre-iteration column check depends on whether the existing loop calls `skipWs` itself. Read the surrounding code; if `skipWs` already runs at the top of the loop, replace it with the indent-aware version above when `isIndented` is true.

- [ ] **Step 7: Run tests.**

Run: `npm run test -w @parser2/compiler --silent 2>&1 | grep -E "indent-interp|^# (tests|pass|fail|skipped)"`
Expected: 3 indent-interp tests PASS; compiler total = 325/325.

- [ ] **Step 8: Verify nothing else regressed.**

Run: `for pkg in parser compiler css html markdown cron; do echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo; done`
Expected: parser 28/28, compiler 325/325, css/html/markdown/cron unchanged.

- [ ] **Step 9: Commit.**

```bash
git add packages/compiler/src/interp/parse.ts packages/compiler/test/indent-interp.test.ts
git commit -m "feat(interp): indent-aware recursive-repeats parse (Task 7.2)"
```

---

## Task 7.3: V2 runtime — `indentStack` state + helpers

**Why third:** Codegen (Task 7.4) emits calls into the runtime helpers; the runtime must define those helpers first. Pure runtime change; no codegen yet.

**Files:**
- Modify: `packages/compiler/src/emit/v2/runtime.ts`
- Test: `packages/compiler/test/indent-runtime.test.ts`

- [ ] **Step 1: Failing test.** Create `packages/compiler/test/indent-runtime.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { V2_RUNTIME } from '../src/emit/v2/runtime.ts';

test('runtime: V2_RUNTIME embeds indentStack in State', () => {
  assert.ok(V2_RUNTIME.includes('indentStack'),
    'V2_RUNTIME must declare indentStack on the State type');
});

test('runtime: V2_RUNTIME exposes columnAt helper', () => {
  assert.ok(V2_RUNTIME.includes('function columnAt'),
    'V2_RUNTIME must export columnAt(state, off)');
});

test('runtime: V2_RUNTIME exposes skipBlankLines helper', () => {
  assert.ok(V2_RUNTIME.includes('function skipBlankLines'),
    'V2_RUNTIME must export skipBlankLines(state)');
});

test('runtime: V2_RUNTIME exposes skipHorizontalWs helper', () => {
  assert.ok(V2_RUNTIME.includes('function skipHorizontalWs'),
    'V2_RUNTIME must export skipHorizontalWs(state)');
});
```

- [ ] **Step 2: Run test to verify it fails.**

Run: `npm run test -w @parser2/compiler --silent 2>&1 | grep -E "indent-runtime|^# (tests|pass|fail|skipped)"`
Expected: 4 indent-runtime tests FAIL.

- [ ] **Step 3: Add `indentStack` to runtime `State` type.** In `packages/compiler/src/emit/v2/runtime.ts`, inside the `V2_RUNTIME` template-literal, update the `State` type definition to:

```ts
type State = {
  readonly input: string;
  readonly len: number;
  pos: number;
  maxOff: number;
  readonly mode: ParseMode;
  readonly lineStarts: number[];
  // Stack of expected column offsets for nested indent scopes. Pushed by
  // emitRepeatsSpan when the span carries kind:'indent'; popped on exit.
  // Fixed Int32Array(16) capacity; the runtime fails the parse if depth > 16.
  // indentStackTop is the count of pushed entries (0 when no indent is active).
  indentStack: Int32Array;
  indentStackTop: number;
};
```

- [ ] **Step 4: Add runtime helpers.** Inside the `V2_RUNTIME` string, immediately after the existing `isWs` / `isDigit` helpers (around line 81), insert:

```ts
function columnAt(state: State, off: number): number {
  // Column (0-indexed) of byte at off within its line. Counts ASCII spaces
  // only — tabs are not supported in the indent MVP (Phase 7).
  const input = state.input;
  let lineStart = off;
  while (lineStart > 0 && input.charCodeAt(lineStart - 1) !== 0x0a) lineStart--;
  return off - lineStart;
}

function skipBlankLines(state: State): void {
  // Advance state.pos past any sequence of lines containing only whitespace.
  // Stops at the first non-whitespace character (without consuming the
  // leading spaces of that line).
  const input = state.input;
  const len = state.len;
  outer: while (state.pos < len) {
    let probe = state.pos;
    while (probe < len) {
      const c = input.charCodeAt(probe);
      if (c === 0x0a) { state.pos = probe + 1; continue outer; }
      if (c === 0x20 || c === 0x09 || c === 0x0d) { probe++; continue; }
      return;
    }
    return;
  }
}

function skipHorizontalWs(state: State): void {
  // Skip ASCII spaces only (no tabs, no newlines). Used after skipBlankLines
  // to land on the first non-space byte of the current line.
  const input = state.input;
  const len = state.len;
  while (state.pos < len && input.charCodeAt(state.pos) === 0x20) state.pos++;
}
```

- [ ] **Step 5: Update every `State` literal in `V2_RUNTIME`** to include `indentStack: new Int32Array(16)` and `indentStackTop: 0`. Search the string for `pos: 0` and add the two new fields. (There is typically one such literal — verify by searching the file.)

- [ ] **Step 6: Run tests.**

Run: `npm run test -w @parser2/compiler --silent 2>&1 | grep -E "indent-runtime|^# (tests|pass|fail|skipped)"`
Expected: 4 indent-runtime tests PASS; compiler total = 329/329.

- [ ] **Step 7: Verify the runtime still compiles in generated parsers.**

Run: `npm run generate -w @parser2/css -w @parser2/html -w @parser2/markdown 2>&1 | tail -20`
Then:
```
for pkg in css html markdown; do
  echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo
done
```
Expected: css 56/57 (1 skip), html 30/30, markdown 76/76 — all unchanged.

- [ ] **Step 8: Commit.**

```bash
git add packages/compiler/src/emit/v2/runtime.ts packages/compiler/test/indent-runtime.test.ts
git commit -m "feat(compiler): v2 runtime gains indentStack + column helpers (Task 7.3)"
```

---

## Task 7.4: V2 codegen — indent-aware repeats loop

**Why fourth:** With the runtime helpers in place and the interpreter as the spec, emit a matching v2-generated parser. The end-to-end test uses the same tiny YAML-list inline schema as Task 7.2; the v2-generated parser must produce the same AST.

**Files:**
- Modify: `packages/compiler/src/emit/v2/span.ts`
- Test: `packages/compiler/test/indent-emit.test.ts`

- [ ] **Step 1: Failing test.** Create `packages/compiler/test/indent-emit.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { $, defineSchema, ex, tpl } from '@parser2/parser';
import { inferSchema } from '../src/infer/index.ts';
import { emitV2Parser } from '../src/emit/v2/index.ts';

const yamlListSchema = defineSchema({
  rootType: 'YamlList',
  examples: [
    ex('- a')
      .as('YamlItem')
      .span('- ')
      .span('value', 'a').until('\n')
      .render('ast', $.value)
      .render('source', tpl`- ${$.value}`)
      .build(),

    ex(`- a
- b`)
      .as('YamlList')
      .indent('items', ['YamlItem']).repeats({ min: 0 })
      .render('ast', { type: 'list', items: $.items })
      .render('source', tpl`${$.items}`)
      .build(),
  ],
});

async function loadGeneratedParser() {
  const schema = inferSchema(yamlListSchema);
  const source = emitV2Parser(schema);
  // Write to a temp file and dynamic-import it.
  const { writeFileSync, mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'indent-emit-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, source, 'utf8');
  return await import(file);
}

test('emit v2: indent-aware repeats parses two top-level items', async () => {
  const mod = await loadGeneratedParser();
  const ast = mod.render('- a\n- b\n', { type: 'ast' });
  assert.deepEqual(ast, { type: 'list', items: ['a', 'b'] });
});

test('emit v2: dedent terminates the repeats loop', async () => {
  const mod = await loadGeneratedParser();
  const ast = mod.render('- a\n- b\n', { type: 'ast' });
  assert.equal((ast as { items: string[] }).items.length, 2);
});

test('emit v2: blank lines inside the indent block are skipped', async () => {
  const mod = await loadGeneratedParser();
  const ast = mod.render('- a\n\n- b\n', { type: 'ast' });
  assert.deepEqual((ast as { items: string[] }).items, ['a', 'b']);
});
```

- [ ] **Step 2: Run test to verify it fails.**

Run: `npm run test -w @parser2/compiler --silent 2>&1 | grep -E "indent-emit|^# (tests|pass|fail|skipped)"`
Expected: 3 indent-emit tests FAIL — the generated parser does not honor the indent modifier.

- [ ] **Step 3: Wire indent into `emitRepeatsSpan`.** In `packages/compiler/src/emit/v2/span.ts`, locate `emitRepeatsSpan` (around line 347). Add at the top of the function, after the `repeats = findModifier(span, 'repeats')!;` line:

```ts
  const isIndented = hasModifier(span, 'indent');
```

Then update the loop-prologue code (where `lines.push(`const ${startVar} = off;`);` and `lines.push(`const ${listVar}: unknown[] = [];`);` appear) to insert indent setup when `isIndented` is true:

```ts
  if (isIndented) {
    // Leading: skip blank lines, then skip horizontal whitespace, then
    // capture the first child's column as the required column for every
    // subsequent iteration. If column <= parent's required column, treat
    // the block as empty (no items, no push).
    lines.push(`state.pos = off;`);
    lines.push(`skipBlankLines(state);`);
    lines.push(`skipHorizontalWs(state);`);
    lines.push(`off = state.pos;`);
    lines.push(`const __indentCol = columnAt(state, off);`);
    lines.push(`const __parentCol = state.indentStackTop > 0 ? state.indentStack[state.indentStackTop - 1] : -1;`);
    lines.push(`let __indentPushed = false;`);
    lines.push(`if (__indentCol > __parentCol) {`);
    lines.push(`  if (state.indentStackTop >= 16) { if (off > state.maxOff) state.maxOff = off; state.pos = ${ctx.entryOffVar}; return null; }`);
    lines.push(`  state.indentStack[state.indentStackTop++] = __indentCol;`);
    lines.push(`  __indentPushed = true;`);
    lines.push(`}`);
  }
```

Then, inside the loop body, BEFORE the existing separator-sweep or `tryItemBlock` (whichever comes first per the current loop layout), insert the per-iteration column gate when `isIndented`:

```ts
  if (isIndented) {
    // After every iteration's whitespace skip, the next line must begin at
    // exactly __indentCol. A smaller column = clean dedent (exit loop). A
    // larger column = unexpected over-indent (also exit; the parent decides
    // whether that's an error).
    lines.push(`  if (__indentPushed) {`);
    lines.push(`    state.pos = off;`);
    lines.push(`    skipBlankLines(state);`);
    lines.push(`    skipHorizontalWs(state);`);
    lines.push(`    off = state.pos;`);
    lines.push(`    if (off >= len) break;`);
    lines.push(`    const __col = columnAt(state, off);`);
    lines.push(`    if (__col !== __indentCol) break;`);
    lines.push(`  }`);
  }
```

After the loop (before the trailing/min/max checks), pop the indent if pushed:

```ts
  if (isIndented) {
    lines.push(`if (__indentPushed) state.indentStackTop--;`);
  }
```

- [ ] **Step 4: Run tests.**

Run: `npm run test -w @parser2/compiler --silent 2>&1 | grep -E "indent-emit|^# (tests|pass|fail|skipped)"`
Expected: 3 indent-emit tests PASS; compiler total = 332/332.

- [ ] **Step 5: Sanity-check existing schemas still emit correctly.**

Run: `npm run generate -w @parser2/css -w @parser2/html -w @parser2/markdown 2>&1 | tail -20`
Then: `for pkg in css html markdown cron; do echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo; done`
Expected: all green; counts unchanged.

- [ ] **Step 6: Commit.**

```bash
git add packages/compiler/src/emit/v2/span.ts packages/compiler/test/indent-emit.test.ts
git commit -m "feat(compiler): v2 codegen emits indent-aware repeats loop (Task 7.4)"
```

---

## Task 7.5: Inverse stringify — emit indent on `target='source'`

**Why fifth:** The round-trip theorem requires `parse → stringify` to round-trip indent-significant input. With Task 7.4 handling parse, the stringifier must emit the correct number of leading spaces for each child of an indent-modified repeats span. Both the interpreter (`packages/compiler/src/interp/stringify.ts`) and any emitter-side template-form inverse code (verify location before editing — likely `packages/compiler/src/emit/v2/index.ts` or a sibling) need matching logic.

**Files:**
- Modify: `packages/compiler/src/interp/stringify.ts`
- Modify: `packages/compiler/src/emit/v2/index.ts` (or wherever template-form inverse render is emitted — verify first)
- Test: `packages/compiler/test/indent-stringify.test.ts`

- [ ] **Step 1: Locate the emitter-side inverse-render code.** Read `packages/compiler/src/emit/v2/index.ts` and grep for the function that handles `target` (`source`) inverse renders. In the current tree, the inverse template is walked during stringify-codegen — read enough to identify the function (it walks `RenderTargetDef.inverse` slot-by-slot). Name it `emitInverseTemplate` (or whatever the actual name is) for the rest of this task.

- [ ] **Step 2: Failing test.** Create `packages/compiler/test/indent-stringify.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { $, defineSchema, ex, tpl } from '@parser2/parser';
import { inferSchema } from '../src/infer/index.ts';
import { interpretParse, interpretStringify } from '../src/interp/index.ts';

const yamlListSchema = defineSchema({
  rootType: 'YamlList',
  examples: [
    ex('- a')
      .as('YamlItem')
      .span('- ')
      .span('value', 'a').until('\n')
      .render('ast', $.value)
      .render('source', tpl`- ${$.value}`)
      .build(),

    ex(`- a
- b`)
      .as('YamlList')
      .indent('items', ['YamlItem']).repeats({ min: 0 })
      .render('ast', { type: 'list', items: $.items })
      .render('source', tpl`${$.items}`)
      .build(),
  ],
});

test('interp stringify: emits items at column 0 with newline separation', () => {
  const schema = inferSchema(yamlListSchema);
  const ast = interpretParse(schema, '- a\n- b\n');
  const source = interpretStringify(schema, ast, 'source');
  // Both items at column 0, separated by a single newline. Trailing newline
  // omitted; round-trip parser tolerates either.
  assert.equal(source, '- a\n- b');
});
```

(Note: `interpretStringify` is the assumed export name; verify against `packages/compiler/src/interp/index.ts` before running and adjust if it's named differently — e.g. `stringify` or `interpStringify`.)

- [ ] **Step 3: Run test to verify it fails.**

Run: `npm run test -w @parser2/compiler --silent 2>&1 | grep -E "indent-stringify|^# (tests|pass|fail|skipped)"`
Expected: indent-stringify test FAILS — items run together without newlines, or with wrong indentation.

- [ ] **Step 4: Update interpreter stringify for indent-modified repeats spans.** In `packages/compiler/src/interp/stringify.ts`, locate the function that handles a slot whose span is recursive-repeats (the function reads each child from the captures array and concatenates them per the inverse template). When the span carries `kind: 'indent'`, the joiner becomes `'\n' + ' '.repeat(parentIndentCol)` where `parentIndentCol` is the current depth — track via a `stringifyState.indentCol` counter that increments when entering an indent scope and decrements on exit. For the MVP, hard-code the increment to 0 (top-level lists at column 0) and just join with `'\n'`; deeper nesting will be exercised by Task 7.7's YAML-block schema and may force the counter to become real.

Concretely, find the loop in `stringify.ts` that renders a repeats span's children (it currently joins with `''` or the span's separator). Replace with:

```ts
// Resolve the join string. Repeats spans with kind:'indent' join children
// with '\n' + leadingPad, where leadingPad is the parent indent column's
// worth of ASCII spaces. The MVP supports column-0 lists; nested indent
// scopes (Task 7.7) will introduce a non-zero pad.
const indentMod = span.modifiers.find((m) => m.kind === 'indent');
const joiner = indentMod
  ? '\n' + ' '.repeat(stringifyState?.indentCol ?? 0)
  : (repeatsMod.sep ?? '');
const childStrings = childValues.map((child) => stringifyOne(...));
return childStrings.join(joiner);
```

(Names like `repeatsMod`, `childValues`, `stringifyOne` are placeholders — match what the existing code uses.)

- [ ] **Step 5: Update emitter-side inverse-template walker.** Apply the same logic to whatever function emits the inverse template at codegen time. The generated stringify function must also join indent-modified repeats children with `'\n' + ' '.repeat(parentIndentCol)`. For the MVP, hard-code the pad to 0 at the top level; the YAML-block schema will reveal whether a runtime `indentCol` parameter is needed.

- [ ] **Step 6: Run tests.**

Run: `npm run test -w @parser2/compiler --silent 2>&1 | grep -E "indent-stringify|^# (tests|pass|fail|skipped)"`
Expected: indent-stringify test PASSES; compiler total = 333/333.

- [ ] **Step 7: Verify no regressions.**

Run: `for pkg in parser compiler css html markdown cron; do echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo; done`
Expected: all green.

- [ ] **Step 8: Commit.**

```bash
git add packages/compiler/src/interp/stringify.ts packages/compiler/src/emit/v2/index.ts packages/compiler/test/indent-stringify.test.ts
git commit -m "feat(compiler): inverse stringify emits indent for kind:'indent' spans (Task 7.5)"
```

---

## Task 7.6: Round-trip theorem holds for indent schema

**Why sixth:** The existing round-trip harness (`packages/compiler/src/check/round-trip.ts`) parses an input, stringifies the result, parses again, and asserts the second parse equals the first. With Tasks 7.2–7.5 in place, the harness should "just work" on indent schemas — but we test it explicitly to lock the contract.

**Files:**
- Modify (if needed): `packages/compiler/src/check/round-trip.ts`
- Test: `packages/compiler/test/indent-roundtrip.test.ts`

- [ ] **Step 1: Read `packages/compiler/src/check/round-trip.ts`** end-to-end. Identify the entry point (likely `roundTrip(schema, input)` or `checkRoundTrip(schema, examples)`). Confirm it threads the same `inferSchema` → parse → stringify → parse pipeline that Tasks 7.2–7.5 modified.

- [ ] **Step 2: Failing test.** Create `packages/compiler/test/indent-roundtrip.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { $, defineSchema, ex, tpl } from '@parser2/parser';
import { inferSchema } from '../src/infer/index.ts';
import { roundTrip } from '../src/check/round-trip.ts';   // adjust import to match the actual export

const yamlListSchema = defineSchema({
  rootType: 'YamlList',
  examples: [
    ex('- a')
      .as('YamlItem')
      .span('- ')
      .span('value', 'a').until('\n')
      .render('ast', $.value)
      .render('source', tpl`- ${$.value}`)
      .build(),

    ex(`- a
- b`)
      .as('YamlList')
      .indent('items', ['YamlItem']).repeats({ min: 0 })
      .render('ast', { type: 'list', items: $.items })
      .render('source', tpl`${$.items}`)
      .build(),
  ],
});

test('round-trip: indent schema parses → stringifies → parses to same AST', () => {
  const schema = inferSchema(yamlListSchema);
  const result = roundTrip(schema, '- a\n- b');
  assert.equal(result.ok, true);   // assuming roundTrip returns { ok, ... }; adjust to actual shape
});
```

- [ ] **Step 3: Run the test.** Most likely PASSES on the first run because round-trip uses `interpretParse` + `interpretStringify`, both of which Tasks 7.2 and 7.5 updated. If it FAILS, the failure points to a missing piece in the chain — read the error, identify which leg of the round-trip fails (the harness should tell you), and add the missing handling. Do NOT silently widen the round-trip's tolerance.

- [ ] **Step 4: Run the full compiler suite.**

Run: `npm run test -w @parser2/compiler --silent 2>&1 | grep -E "^# (tests|pass|fail|skipped)"`
Expected: 334/334.

- [ ] **Step 5: Commit.**

```bash
git add packages/compiler/test/indent-roundtrip.test.ts
# If round-trip.ts needed edits, add it too.
git commit -m "test(compiler): round-trip theorem holds for indent schema (Task 7.6)"
```

---

## Task 7.7: Exit-gate schema — `packages/yaml-block`

**Why seventh:** The exit gate. A real, in-repo schema that parses 50 lines of representative YAML-block input correctly through (a) v2 TS backend, (b) reference interpreter, and (c) round-trip theorem.

**Files:**
- Create: `packages/yaml-block/package.json`
- Create: `packages/yaml-block/tsconfig.json`
- Create: `packages/yaml-block/src/schema.ts`
- Create: `packages/yaml-block/src/index.ts`
- Create: `packages/yaml-block/test/yaml-block.test.ts`
- Create: `packages/yaml-block/test/round-trip.test.ts`
- Modify: root `package.json` (workspaces array — add `packages/yaml-block`)
- Modify: root `tsconfig.json` if it references workspaces explicitly

- [ ] **Step 1: Create the package skeleton.** Mirror `packages/cron/` as the structural template. `packages/yaml-block/package.json`:

```json
{
  "name": "@parser2/yaml-block",
  "version": "0.0.1",
  "type": "module",
  "private": true,
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema.ts"
  },
  "scripts": {
    "generate": "tsx ../compiler/src/cli.ts ./src/schema.ts -o ./src/_generated",
    "test": "tsx --test test/**/*.test.ts"
  },
  "dependencies": {
    "@parser2/parser": "*",
    "@parser2/compiler": "*"
  }
}
```

`packages/yaml-block/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

(Adjust paths to match the repo's existing pattern — check `packages/cron/tsconfig.json`.)

- [ ] **Step 2: Add the workspace to root `package.json`.** In the `"workspaces": [...]` array, append `"packages/yaml-block"`. Order matches the existing list.

- [ ] **Step 3: Draft the schema.** `packages/yaml-block/src/schema.ts`:

```ts
import { $, defineSchema, ex, tpl } from '@parser2/parser';

export default defineSchema({
  rootType: 'YamlBlock',
  examples: [
    // --- YamlScalar: a bare value (one line, anything-but-newline) -----------
    ex('hello world')
      .as('YamlScalar')
      .span('value', 'hello world').until('\n')
      .render('ast', $.value)
      .render('source', tpl`${$.value}`)
      .build(),

    // --- YamlMappingEntry: `key: value` (value is a YamlNode — scalar or nested block) ---
    ex('foo: bar')
      .as('YamlMappingEntry')
      .span('key', 'foo').ident().css()
      .span(':')
      .span(' ').optional()
      .span('value', 'bar', ['YamlNode'])
      .render('ast', { type: 'entry', key: $.key, value: $.value })
      .render('source', tpl`${$.key}: ${$.value}`)
      .build(),

    // --- YamlMapping: indented block of YamlMappingEntry -----------------
    ex(`foo: 1
bar: 2`)
      .as('YamlMapping')
      .indent('entries', ['YamlMappingEntry']).repeats({ min: 1 })
      .render('ast', { type: 'mapping', entries: $.entries })
      .render('source', tpl`${$.entries}`)
      .build(),

    // --- YamlSequenceItem: `- value` (value is a YamlNode) ---------------
    ex('- foo')
      .as('YamlSequenceItem')
      .span('-')
      .span(' ')
      .span('value', 'foo', ['YamlNode'])
      .render('ast', $.value)
      .render('source', tpl`- ${$.value}`)
      .build(),

    // --- YamlSequence: indented block of YamlSequenceItem ----------------
    ex(`- a
- b`)
      .as('YamlSequence')
      .indent('items', ['YamlSequenceItem']).repeats({ min: 1 })
      .render('ast', { type: 'sequence', items: $.items })
      .render('source', tpl`${$.items}`)
      .build(),

    // --- YamlNode: a scalar OR a sequence OR a mapping --------------------
    // Multi-role dispatch — the role-ladder picks based on first byte:
    //   '-' → YamlSequence
    //   letter/digit → YamlMapping or YamlScalar (try mapping first)
    ex('hello')
      .as('YamlNode')
      .span('node', 'hello', ['YamlScalar', 'YamlMapping', 'YamlSequence'])
      .render('ast', $.node)
      .render('source', tpl`${$.node}`)
      .build(),

    // --- YamlBlock: root — a single YamlNode ----------------------------
    ex('foo: bar')
      .as('YamlBlock')
      .span('root', 'foo: bar', ['YamlNode'])
      .render('ast', $.root)
      .render('source', tpl`${$.root}`)
      .build(),
  ],
});
```

(This is a draft — expect to iterate during Steps 5-7 as the test inputs surface ambiguity.)

- [ ] **Step 4: Wire `packages/yaml-block/src/index.ts`.** Re-export the generated parser. Mirror `packages/cron/src/index.ts`:

```ts
export * from './_generated/parser.ts';
```

- [ ] **Step 5: Generate the parser.**

```bash
npm install   # picks up the new workspace
npm run generate -w @parser2/yaml-block
```

Expected: `packages/yaml-block/src/_generated/parser.ts` exists and tsc-builds without errors. If codegen fails, read the error — most likely a missing punctuator, an under-specified `until`, or a multi-role dispatch ambiguity. Fix in `schema.ts` and re-run.

- [ ] **Step 6: 50-line representative input.** Create `packages/yaml-block/test/yaml-block.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { render } from '../src/index.ts';

const FIFTY_LINE_INPUT = `name: my-project
version: 1.0.0
authors:
  - alice
  - bob
  - carol
dependencies:
  parser: 0.0.1
  compiler: 0.0.1
scripts:
  build: tsc
  test: vitest run
config:
  debug: true
  verbose: false
  endpoints:
    primary: api.example.com
    fallback: backup.example.com
tasks:
  - phase: 1
    name: indent primitive
    files:
      - parser/example.ts
      - compiler/runtime.ts
  - phase: 2
    name: yaml schema
    files:
      - yaml-block/schema.ts
servers:
  - name: production
    region: us-east
    capacity: 10
  - name: staging
    region: us-west
    capacity: 2
constants:
  pi: 3.14
  e: 2.71
flags:
  unicode: false
  caseSensitive: true
notes:
  - first item
  - second item
  - third item
  - fourth item
  - fifth item`;

test('yaml-block: 50-line representative input parses', () => {
  const ast = render(FIFTY_LINE_INPUT, { type: 'ast' });
  // Top-level is a mapping with ~15 entries; spot-check structure.
  assert.equal((ast as { type: string }).type, 'mapping');
  const entries = (ast as { entries: unknown[] }).entries;
  assert.ok(entries.length >= 10, `expected ≥10 top-level entries, got ${entries.length}`);
});

test('yaml-block: parses through reference interpreter (matches v2 backend)', () => {
  // Import the source schema (not the generated parser) and parse via interp.
  // Both should produce the same AST.
  // (Test details depend on whether interp is exposed via the yaml-block
  // package or imported from @parser2/compiler — pick the appropriate path
  // when implementing.)
});
```

- [ ] **Step 7: Run.**

```bash
npm run test -w @parser2/yaml-block 2>&1 | grep -E "^# (tests|pass|fail|skipped)"
```

Expected: yaml-block 2/2.

If the 50-line input does not parse, the failure points to a real gap in the design — read the error carefully. Common failure modes:
- "Unexpected `:` at position N" → the YamlMappingEntry production didn't engage; check the multi-role dispatch in YamlNode (first byte = letter, but the schema's tag map may not include letter→YamlMapping).
- Trailing whitespace mismatch → the `.until('\n')` capture stripped the trailing space; either trim explicitly or change the scalar production.
- Indent dedent fires too early → blank-line handling in Task 7.4 may need a tweak.

Fix in `schema.ts` or — only if absolutely necessary — bounce back to Task 7.4 and refine the indent codegen.

- [ ] **Step 8: Round-trip test.** Create `packages/yaml-block/test/round-trip.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { render, stringify } from '../src/index.ts';

test('yaml-block: parses → stringifies → parses to same AST', () => {
  const input = `foo: 1
bar:
  baz: 2
  qux: 3
items:
  - a
  - b`;
  const ast1 = render(input, { type: 'ast' });
  const source = stringify(ast1, { type: 'ast' });
  const ast2 = render(source as string, { type: 'ast' });
  assert.deepEqual(ast2, ast1);
});
```

Run: `npm run test -w @parser2/yaml-block 2>&1 | grep -E "^# (tests|pass|fail|skipped)"`
Expected: yaml-block 3/3.

If the round-trip fails, the stringifier is emitting indent at the wrong column — track down the bug in `packages/compiler/src/interp/stringify.ts` and / or the emitter's inverse-template walker (Task 7.5). The MVP hard-coded indent to column 0; nested mappings/sequences (e.g. the `bar.baz` entry above) require a real `indentCol` counter. Add it now if missing.

- [ ] **Step 9: Final verification — all packages green.**

```bash
for pkg in parser compiler css html markdown cron yaml-block; do
  echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo
done
```

Expected: all green; parser 28/28, compiler 334/334, css 56/57 (1 skip), html 30/30, markdown 76/76, cron 15/15, yaml-block 3/3.

- [ ] **Step 10: Commit.**

```bash
git add packages/yaml-block package.json
git commit -m "feat(yaml-block): exit-gate schema for Phase 7 indent primitive (Task 7.7)"
```

---

## Task 7.8: Phase 7 closeout documentation

**Why last:** Records what shipped, what's still open, where Phase 8 picks up.

**Files:**
- Modify: `docs/v2-migration-status.md`
- Modify: `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md`

- [ ] **Step 1: Add a "Phase 7 closeout" section to `docs/v2-migration-status.md`.** Mirror the structure of the "Phase 6 closeout (2026-05-27)" section. Include:
  - Brief design summary (modifier choice, locked decisions).
  - "What landed (Phase 7)" table with task → commit SHA → what landed.
  - Exit gate status:
    - YAML-block schema parses 50-line representative input through v2 TS backend, reference interpreter, and round-trip theorem (all three checks PASS).
  - "Phase 7 follow-ups (deferrable)" section listing real gaps:
    - Tab characters not supported in indent columns (MVP is ASCII space only).
    - Bytecode backend has no indent support (cron stays the only bytecode-tested schema).
    - Nested indent levels deeper than 16 fail the parse (hard-coded `Int32Array(16)`).
    - Any others surfaced during implementation.

- [ ] **Step 2: Mark Phase 7 complete in the master plan.** Edit `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md` § "Phase 7 — Indentation primitive" — add a top-of-section `**Status: CLOSED 2026-05-XX.** See docs/v2-migration-status.md "Phase 7 closeout" for details.` (substituting today's date).

- [ ] **Step 3: Commit.**

```bash
git add docs/v2-migration-status.md docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md
git commit -m "docs: Phase 7 indentation-primitive closeout (Task 7.8)"
```

- [ ] **Step 4: Push if working on a worktree branch; otherwise leave on main.**

```bash
git log --oneline -10
```

Expected: 7 task commits + 1 docs closeout on top of `e72ccaf` (the handoff doc commit).

---

## Self-review checklist (run before dispatching Task 7.1)

- [ ] Every task has a numbered Step 1 (failing test) → Step N (commit). No "TBD" markers anywhere.
- [ ] Type names (`SpanModifier`, `ResolvedSpan`, `State`, `Int32Array`) match between tasks.
- [ ] File paths are absolute-from-repo-root and exist (or are explicitly Create).
- [ ] Each task's expected test count tracks cumulatively: 7.1 adds 3, 7.2 adds 3, 7.3 adds 4, 7.4 adds 3, 7.5 adds 1, 7.6 adds 1, 7.7 adds 3. Phase end: parser 28, compiler 334, yaml-block 3.
- [ ] Commit message format matches Phase 6 (`feat(parser):`, `feat(compiler):`, `feat(interp):`, `feat(yaml-block):`, `test(compiler):`, `docs:`).
- [ ] Exit-gate criteria are concrete and observable: 50-line input parses through three pipelines.
- [ ] Bytecode backend is explicitly out of scope; do not let a subagent silently extend Phase 7 into it.
