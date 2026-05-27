# Phase 8 — Unicode policy & case-insensitive primitives

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add schema-level dials — `unicode`, `newlines`, `caseSensitive`, `bom` — that bake input-normalization passes into the parse-entry preamble. After this phase, HTML schemas can accept `<DIV>` and `<div>` equivalently, email/URL grammars can normalize Unicode at the boundary, and Windows-friendly CRLF input becomes a one-line schema change.

**Architecture:** Four orthogonal input-normalization steps applied once at parse entry (BOM → Unicode normalize → newline canonicalize → case fold). Each step is a one-time O(n) string operation; codegen emits only the steps the schema actually opts in to, so a schema using defaults produces byte-identical generated code to today. The reference interpreter (`packages/compiler/src/interp/parse.ts`) and the v2 TS emitter (`packages/compiler/src/emit/v2/index.ts`) gain matching preamble logic. Bytecode backend NOT touched (Phase 6 left it bound to cron only).

**Tech Stack:** TypeScript 5.x (Node 20+), tsx for codegen, `node:test` for regressions. No new dependencies — `String.prototype.normalize` (ES2015) and `String.prototype.toLowerCase` are built-ins.

---

## Decisions locked at plan-start

### Policy unions and defaults

| Dial | Type | Default | Semantics |
| --- | --- | --- | --- |
| `bom` | `'allow' \| 'reject' \| 'require'` | `'allow'` | `'allow'` strips a leading U+FEFF if present. `'reject'` throws if present. `'require'` throws if absent. Applied first. |
| `unicode` | `'NFC' \| 'NFD' \| 'none'` | `'none'` | `'NFC'` / `'NFD'` call `input.normalize(form)` once at entry. `'none'` is a no-op. Applied after BOM. |
| `newlines` | `'LF' \| 'CRLF' \| 'either-preserve'` | `'LF'` | `'LF'` is a no-op (input is taken as-is — lone `\r` will fail literal matches at scan time, on the schema author). `'CRLF'` normalizes `\r\n → \n` at entry. `'either-preserve'` normalizes both `\r\n` and lone `\r` to `\n` at entry. Applied after Unicode normalize. |
| `caseSensitive` | `boolean` | `true` | When `false`, input is lowercased via `input.toLowerCase()` at parse entry, AFTER all earlier steps. Applied last. Captures see the lowercased view; the schema author writes examples in canonical (lowercase) form. |

### Why these defaults

- `bom: 'allow'` — the realistic default; legacy editors emit BOMs and the parser should silently tolerate them. `'reject'` and `'require'` are escape hatches for grammars (e.g., strict UTF-8 readers) that need to fail loud.
- `unicode: 'none'` — Unicode normalization is not free (`String.prototype.normalize` walks the string once). Schemas opt in only when they need it. The HTML / cron / yaml-block schemas don't.
- `newlines: 'LF'` — matches the existing behavior. CSS/HTML/markdown all assume `\n`-terminated input today. Schemas opt in to `'CRLF'` or `'either-preserve'` when they need Windows-friendliness.
- `caseSensitive: true` — matches the existing behavior. HTML opts out in Task 8.5. CSS keywords (`url(...)`, `rgb(...)`) and JSON literals (`true`, `false`) are case-sensitive; the default is right.

### What "lossy round-trip" means

Two of the dials introduce a value-stable / byte-unstable distinction. Both have precedent in earlier phases:

1. **`caseSensitive: false`** — input `<DIV>foo</DIV>` lowercases to `<div>foo</div>` before parse. Captures store `'div'` for the tag name. Inverse stringify emits `<div>foo</div>`. The first round-trip changes bytes (uppercase → lowercase); every subsequent round-trip is byte-stable. The AST is the same for both inputs — this is what callers want.

2. **`newlines: 'either-preserve'`** — input `'line1\r\nline2\n'` normalizes to `'line1\nline2\n'` at entry. Stringify emits `\n` only. CRLF input becomes LF output on the first round-trip; LF stays LF. Value-stable; not byte-stable for CRLF input.

Precedent: Phase 7 follow-up #1 (forward source render flattens indent), Phase 6 follow-up #2 (bytecode optional-absent trailing whitespace) — known lossy normalizations are documented and accepted.

### Scope locks

1. **Codegen targets the v2 TS backend only.** Bytecode backend stays bound to cron (per Phase 6 closeout). Phase 8 dials are emitted by `emit/v2/index.ts`; the bytecode encoder ignores them. Adding bytecode support is a deferred follow-up.
2. **ASCII-only assumption for `caseSensitive: false`.** `input.toLowerCase()` does Unicode-aware default case folding, which is correct for ASCII tag names. Grammars with non-ASCII tokens (e.g. Greek letters in math notation) may hit locale edge cases; documented as a known limitation. Turkish dotless-i is the canonical gotcha — `.toLowerCase()` is locale-independent (uses Unicode default case mapping, not `toLocaleLowerCase`), so this is safer than it could be.
3. **No per-pattern dials.** Phase 8 is schema-wide. A schema cannot mark some literals case-insensitive while keeping others case-sensitive. The existing `.oneOf({ caseInsensitive: true })` refinement (used by `parseLiteralSpan` for `.html()` ident matching) is value-level and unaffected — it stays as the escape hatch.
4. **Round-trip theorem treatment.** `checkRoundTrip` already compares value stability for non-`ast` targets. Schemas with `caseSensitive: false` or `newlines: 'either-preserve'` must write examples in the canonical form (lowercase, LF). Non-canonical inputs are tested via separate package-level tests; the theorem is not asked to prove byte stability for them.
5. **Forward `render(input, opts)` path matches `__parse` preamble.** The forward `render` path internally calls `__parse` first, then walks captures into the target shape. Since `__parse` applies the preamble, `render` inherits the normalization for free. No separate render-side wiring.

---

## Pre-flight: working directory + baseline

Working directory: `/Users/valerii/Develop/parser3_codex` (main branch). Phase 8 develops directly on `main` (no worktree). The 19 prior commits sit at `1a78ce7`.

Verify baseline (last known good after Phase 7 closeout, 2026-05-27):

```bash
for pkg in parser compiler css html markdown cron yaml-block; do
  echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo
done
```

Expected: parser 28/28, compiler 335/335, css 56/57 (1 skip), html 30/30, markdown 76/76, cron 15/15, yaml-block 9/9.

Pre-existing failures in `mac` and `css-color` are unrelated and stay deferred (Phase 7 follow-up #8).

---

## File-touch map

**New files:**
- `packages/parser/test/schema-dials.test.ts` — `defineSchema` returns the four new dials with documented defaults; explicit values override.
- `packages/compiler/test/unicode-preamble.test.ts` — interp + emit paths apply BOM strip and Unicode normalize at entry.
- `packages/compiler/test/newlines-preamble.test.ts` — interp + emit paths normalize CRLF / either-preserve newlines at entry.
- `packages/compiler/test/case-insensitive.test.ts` — interp + emit paths lowercase input at entry; mixed-case input parses identically to lowercase.
- `packages/compiler/test/unicode-roundtrip.test.ts` — inline email-like schema with `unicode: 'NFC'` produces NFC captures from NFD input and round-trips.
- `packages/html/test/case-insensitive.test.ts` — `<DIV>`, `<Script>`, `<A HREF="...">` parse equivalently to lowercase; AST values are canonical lowercase.

**Modified files:**
- `packages/parser/src/types.ts` — add `BomPolicy`, `UnicodeForm`, `NewlinePolicy` type unions; add the four new fields to `SchemaDef` and `SchemaInput`.
- `packages/parser/src/schema.ts` — extend `defineSchema` to default and propagate the four new dials.
- `packages/compiler/src/model.ts` — add the four new fields to `InferredSchema`.
- `packages/compiler/src/index.ts` — extend `inferSchema` to copy the four new dials from `SchemaDef` into `InferredSchema`.
- `packages/compiler/src/interp/parse.ts` — apply the four-step preamble inside `interpretParse` and `interpretParseCaptures` before constructing `State`.
- `packages/compiler/src/emit/v2/index.ts` — `emitPublicApi` emits the same four-step preamble inside the generated `__parse` body, conditional on each schema dial.
- `packages/html/src/schema.ts` — set `caseSensitive: false` on the schema.
- `packages/html/src/_generated/parser.ts` — regenerated to pick up case-insensitive lowercase preamble.
- `docs/v2-migration-status.md` — Phase 8 closeout section.
- `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md` — Phase 8 marked closed at the bottom of the file (Task 8.8).

**Out-of-scope (do not touch):**
- `packages/compiler/src/emit/bytecode/**` — bytecode backend stays bound to cron.
- `packages/{arn,js,log,mac,proto,url,css-color,css-length-percentage}` — out-of-scope packages (still broken on the old DSL).
- `packages/cron`, `packages/yaml-block` — not exercised by Phase 8.
- `packages/css`, `packages/markdown` schemas — case-sensitive is the right default for them; do not touch.

---

## Task 8.1: Schema-level dials — data shape + defaults

**Why first:** Every later task reads from `schema.bom` / `schema.unicode` / `schema.newlines` / `schema.caseSensitive`. Until those fields exist on `SchemaDef` and `InferredSchema`, there is nothing for the preamble emitters to consult. Pure data-shape change; no behavior yet.

**Files:**
- Modify: `packages/parser/src/types.ts`
- Modify: `packages/parser/src/schema.ts`
- Modify: `packages/compiler/src/model.ts`
- Modify: `packages/compiler/src/index.ts`
- Test: `packages/parser/test/schema-dials.test.ts`

- [ ] **Step 1: Failing test.** Create `packages/parser/test/schema-dials.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { defineSchema, ex } from '../src/index.ts';

const minimalExample = ex('a')
  .as('Leaf')
  .span('a')
  .render('ast', 'a')
  .render('source', 'a')
  .build();

test('schema dials: defaults match documented values', () => {
  const schema = defineSchema({
    rootType: 'Leaf',
    examples: [minimalExample],
  });
  assert.equal(schema.bom, 'allow');
  assert.equal(schema.unicode, 'none');
  assert.equal(schema.newlines, 'LF');
  assert.equal(schema.caseSensitive, true);
});

test('schema dials: explicit values override defaults', () => {
  const schema = defineSchema({
    rootType: 'Leaf',
    bom: 'reject',
    unicode: 'NFC',
    newlines: 'either-preserve',
    caseSensitive: false,
    examples: [minimalExample],
  });
  assert.equal(schema.bom, 'reject');
  assert.equal(schema.unicode, 'NFC');
  assert.equal(schema.newlines, 'either-preserve');
  assert.equal(schema.caseSensitive, false);
});
```

- [ ] **Step 2: Run test to verify it fails.**

Run: `npm run test -w @parser2/parser 2>&1 | grep -E "schema dials|^# (tests|pass|fail|skipped)"`

Expected: 2 schema-dials tests FAIL (`schema.bom is undefined`, etc.).

- [ ] **Step 3: Add policy types to `parser/src/types.ts`.** Insert immediately after the existing `UnknownCharPolicy` declaration (around line 12):

```ts
// Phase 8 dials — applied at parse entry as a single composable preamble.
// All four are no-ops at their default values; the v2 emitter only emits
// preamble code for the dials a schema explicitly changes from default.

// BOM (U+FEFF) handling at parse entry.
//   'allow'   — strip a leading BOM if present (default).
//   'reject'  — throw a parse error if a BOM is present.
//   'require' — throw a parse error if a BOM is absent.
export type BomPolicy = 'allow' | 'reject' | 'require';

// Unicode normalization applied to the entire input before scan.
//   'none' — no normalization (default).
//   'NFC'  — call input.normalize('NFC') once at entry.
//   'NFD'  — call input.normalize('NFD') once at entry.
export type UnicodeForm = 'none' | 'NFC' | 'NFD';

// Newline canonicalization applied to the entire input before scan.
//   'LF'              — no transform (default). Lone \r will fail literal
//                       matches at scan time; the schema author owns that.
//   'CRLF'            — normalize \r\n → \n once at entry.
//   'either-preserve' — normalize \r\n → \n and lone \r → \n once at entry.
//                       Round-trip is value-stable but not byte-stable for
//                       CRLF input (it becomes LF on the first stringify).
export type NewlinePolicy = 'LF' | 'CRLF' | 'either-preserve';
```

- [ ] **Step 4: Extend `SchemaDef` and `SchemaInput` in `parser/src/types.ts`.**

In `SchemaDef` (around line 301-315), after `unknownChars`:

```ts
  readonly bom: BomPolicy;
  readonly unicode: UnicodeForm;
  readonly newlines: NewlinePolicy;
  // When false, input is lowercased via input.toLowerCase() at parse entry,
  // AFTER bom/unicode/newlines. Captures see the lowercased view. Schemas
  // with caseSensitive:false must write examples in canonical (lowercase)
  // form for the round-trip theorem.
  readonly caseSensitive: boolean;
```

In `SchemaInput` (around line 322-332), after `unknownChars`, with `?` markers:

```ts
  readonly bom?: BomPolicy;
  readonly unicode?: UnicodeForm;
  readonly newlines?: NewlinePolicy;
  readonly caseSensitive?: boolean;
```

- [ ] **Step 5: Default and propagate in `parser/src/schema.ts`.** Update `defineSchema` (currently lines 10-22) to:

```ts
export function defineSchema(input: SchemaInput): SchemaDef {
  return {
    rootType: input.rootType,
    uses: input.uses ?? [],
    operators: input.operators ?? {},
    punctuators: normalizePunctuators(input.punctuators),
    tokens: normalizeTokens(input.tokens),
    whitespace: input.whitespace ?? 'standard',
    unknownChars: input.unknownChars ?? 'reject',
    bom: input.bom ?? 'allow',
    unicode: input.unicode ?? 'none',
    newlines: input.newlines ?? 'LF',
    caseSensitive: input.caseSensitive ?? true,
    defaultTarget: input.defaultTarget,
    examples: input.examples,
  };
}
```

- [ ] **Step 6: Extend `InferredSchema` in `compiler/src/model.ts`.** After the `unknownChars` field (around line 126), add:

```ts
  readonly bom: BomPolicy;
  readonly unicode: UnicodeForm;
  readonly newlines: NewlinePolicy;
  readonly caseSensitive: boolean;
```

Add the imports at the top of the file:

```ts
import type {
  // ...existing imports...
  BomPolicy,
  UnicodeForm,
  NewlinePolicy,
} from '@parser2/parser';
```

(If the file currently re-exports types from `@parser2/parser`, append to the existing import; otherwise add a new import line. Check lines 1-30 of `model.ts` for the import style and follow it.)

- [ ] **Step 7: Propagate in `compiler/src/index.ts` `inferSchema`.** Update the `inferred` literal (lines 44-56) to include:

```ts
  const inferred: InferredSchema = {
    packageName: options.packageName ?? 'parser',
    rootType: root.rootType,
    nodeTypes,
    literals,
    literalTypeByText,
    classes,
    tokenTypeIds,
    whitespace: root.whitespace,
    unknownChars: root.unknownChars,
    bom: root.bom,
    unicode: root.unicode,
    newlines: root.newlines,
    caseSensitive: root.caseSensitive,
    defaultTarget: root.defaultTarget,
    validation,
  };
```

- [ ] **Step 8: Run the schema-dials test.**

Run: `npm run test -w @parser2/parser 2>&1 | grep -E "schema dials|^# (tests|pass|fail|skipped)"`

Expected: 2 schema-dials tests PASS; parser total = 30/30.

- [ ] **Step 9: Verify in-scope packages still build/parse.**

Run:
```bash
npm run test -w @parser2/compiler 2>&1 | grep -E "^# (tests|pass|fail|skipped)"
for pkg in css html markdown cron yaml-block; do
  echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo
done
```

Expected: compiler 335/335, all schemas unchanged. The new `bom`/`unicode`/`newlines`/`caseSensitive` fields exist but no codepath reads them yet, so behavior is unchanged.

- [ ] **Step 10: Commit.**

```bash
git add packages/parser/src/types.ts packages/parser/src/schema.ts \
        packages/compiler/src/model.ts packages/compiler/src/index.ts \
        packages/parser/test/schema-dials.test.ts
git commit -m "feat(parser): add schema-level Unicode/case/BOM/newlines dials (Task 8.1)"
```

---

## Task 8.2: Interp preamble — BOM, Unicode, newlines

**Why second:** The reference interpreter is the spec. Implement the input-normalization preamble there first so the v2 emitter has a target to match. The preamble runs ONCE at the top of `interpretParse` / `interpretParseCaptures`, before the `State` literal is constructed. Case-folding is deferred to Task 8.4 so this task stays focused.

**Files:**
- Modify: `packages/compiler/src/interp/parse.ts`
- Test: `packages/compiler/test/unicode-preamble.test.ts`

- [ ] **Step 1: Failing test.** Create `packages/compiler/test/unicode-preamble.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { $, defineSchema, ex, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { interpretParse } from '../src/interp/index.ts';

// Schema that captures "everything until newline" as a single value. Useful
// for asserting on the raw post-preamble shape of the input.
function makeLineSchema(opts: { bom?: 'allow' | 'reject' | 'require'; unicode?: 'NFC' | 'NFD' | 'none' }) {
  return defineSchema({
    rootType: 'Line',
    bom: opts.bom,
    unicode: opts.unicode,
    examples: [
      ex('hello')
        .as('Line')
        .span('text', 'hello').until('\n')
        .render('ast', $.text)
        .render('source', tpl`${$.text}`)
        .build(),
    ],
  });
}

test('interp preamble: BOM allow strips leading U+FEFF', () => {
  const schema = inferSchema(makeLineSchema({ bom: 'allow' }));
  assert.equal(interpretParse(schema, '﻿hello'), 'hello');
});

test('interp preamble: BOM allow is a no-op when absent', () => {
  const schema = inferSchema(makeLineSchema({ bom: 'allow' }));
  assert.equal(interpretParse(schema, 'hello'), 'hello');
});

test('interp preamble: BOM reject throws if BOM is present', () => {
  const schema = inferSchema(makeLineSchema({ bom: 'reject' }));
  assert.throws(() => interpretParse(schema, '﻿hello'), /BOM/);
});

test('interp preamble: BOM require throws if BOM is absent', () => {
  const schema = inferSchema(makeLineSchema({ bom: 'require' }));
  assert.throws(() => interpretParse(schema, 'hello'), /BOM/);
});

test('interp preamble: unicode NFC normalizes NFD input', () => {
  const schema = inferSchema(makeLineSchema({ unicode: 'NFC' }));
  // 'é' as NFD = 'e' + combining acute (U+0301). Span text is the NFC form
  // 'é' (U+00E9). After normalize('NFC') the input becomes the NFC form,
  // matching the schema's literal expectation.
  const nfd = 'café'; // 'cafe' + combining acute
  const expected = 'café';   // 'café' precomposed
  const schemaWithDiacritic = inferSchema(
    defineSchema({
      rootType: 'Line',
      unicode: 'NFC',
      examples: [
        ex('café')
          .as('Line')
          .span('text', 'café').until('\n')
          .render('ast', $.text)
          .render('source', tpl`${$.text}`)
          .build(),
      ],
    }),
  );
  const result = interpretParse(schemaWithDiacritic, nfd);
  assert.equal(result, expected);
});

test('interp preamble: unicode none leaves input as-is', () => {
  const schemaWithDiacritic = inferSchema(
    defineSchema({
      rootType: 'Line',
      unicode: 'none',
      examples: [
        ex('café')
          .as('Line')
          .span('text', 'café').until('\n')
          .render('ast', $.text)
          .render('source', tpl`${$.text}`)
          .build(),
      ],
    }),
  );
  // NFC input matches NFC schema literal → success.
  assert.equal(interpretParse(schemaWithDiacritic, 'café'), 'café');
  // NFD input does NOT match NFC schema literal when unicode='none'.
  assert.throws(() => interpretParse(schemaWithDiacritic, 'café'));
});
```

- [ ] **Step 2: Run test to verify it fails.**

Run: `npm run test -w @parser2/compiler 2>&1 | grep -E "interp preamble|^# (tests|pass|fail|skipped)"`

Expected: 6 interp-preamble tests FAIL (interpreter ignores the dials today).

- [ ] **Step 3: Add a preamble helper at the top of `interp/parse.ts`.** Immediately after the existing imports and before the `State` type declaration (around line 32), insert:

```ts
// --- Phase 8 input-normalization preamble ---------------------------------
//
// Applied once at parse entry, before the State is constructed. Each step
// is a no-op at the schema's default dial value, so a schema using all
// defaults gets identical behavior to pre-Phase-8.
function applyPreamble(schema: InferredSchema, input: string): string {
  // 1. BOM handling.
  const hasBom = input.charCodeAt(0) === 0xfeff;
  switch (schema.bom) {
    case 'allow':
      if (hasBom) input = input.slice(1);
      break;
    case 'reject':
      if (hasBom) {
        throw new SyntaxError('interp: schema rejects BOM; input begins with U+FEFF');
      }
      break;
    case 'require':
      if (!hasBom) {
        throw new SyntaxError('interp: schema requires BOM; input does not begin with U+FEFF');
      }
      input = input.slice(1);
      break;
  }
  // 2. Unicode normalization.
  if (schema.unicode !== 'none') {
    input = input.normalize(schema.unicode);
  }
  // 3. Newline canonicalization (Task 8.3 wires this in).
  // 4. Case fold (Task 8.4 wires this in).
  return input;
}
```

- [ ] **Step 4: Call `applyPreamble` from `interpretParse` and `interpretParseCaptures`.**

Replace the top of `interpretParse` (currently lines 88-90):

```ts
export function interpretParse(schema: InferredSchema, input: string): unknown {
  input = applyPreamble(schema, input);
  const state: State = { input, len: input.length, pos: 0, maxOff: 0, indentStack: [] };
```

Apply the same change to `interpretParseCaptures` (currently lines 107-109):

```ts
export function interpretParseCaptures(schema: InferredSchema, input: string): Captures {
  input = applyPreamble(schema, input);
  const state: State = { input, len: input.length, pos: 0, maxOff: 0, indentStack: [] };
```

- [ ] **Step 5: Run the unicode-preamble tests.**

Run: `npm run test -w @parser2/compiler 2>&1 | grep -E "interp preamble|^# (tests|pass|fail|skipped)"`

Expected: 6 interp-preamble tests PASS; compiler total = 341/341.

- [ ] **Step 6: Verify nothing else regressed.**

Run:
```bash
for pkg in parser compiler css html markdown cron yaml-block; do
  echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo
done
```

Expected: all schemas unchanged from baseline (they all use the default `bom: 'allow'`, `unicode: 'none'` — preamble is BOM-strip only, which is a no-op when no BOM is present).

- [ ] **Step 7: Commit.**

```bash
git add packages/compiler/src/interp/parse.ts \
        packages/compiler/test/unicode-preamble.test.ts
git commit -m "feat(interp): BOM + Unicode normalize preamble at parse entry (Task 8.2)"
```

---

## Task 8.3: Newline normalization in the interp preamble

**Why third:** Newlines belong in the same preamble as BOM and Unicode. Splitting them out keeps the commits focused and surfaces newline-specific test coverage. The codegen-side change comes in Task 8.5; this task stays in the interpreter.

**Files:**
- Modify: `packages/compiler/src/interp/parse.ts`
- Test: `packages/compiler/test/newlines-preamble.test.ts`

- [ ] **Step 1: Failing test.** Create `packages/compiler/test/newlines-preamble.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { $, defineSchema, ex, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { interpretParse } from '../src/interp/index.ts';

function twoLineSchema(opts: { newlines: 'LF' | 'CRLF' | 'either-preserve' }) {
  return defineSchema({
    rootType: 'Doc',
    newlines: opts.newlines,
    examples: [
      ex('a\nb')
        .as('Doc')
        .span('a', 'a').until('\n')
        .span('\n')
        .span('b', 'b').until('\n')
        .render('ast', { a: $.a, b: $.b })
        .render('source', tpl`${$.a}\n${$.b}`)
        .build(),
    ],
  });
}

test('newlines: CRLF input normalizes to LF', () => {
  const schema = inferSchema(twoLineSchema({ newlines: 'CRLF' }));
  assert.deepEqual(interpretParse(schema, 'a\r\nb'), { a: 'a', b: 'b' });
});

test('newlines: LF default leaves input unchanged', () => {
  const schema = inferSchema(twoLineSchema({ newlines: 'LF' }));
  // The schema's literal '\n' won't match '\r\n' → parse fails.
  assert.throws(() => interpretParse(schema, 'a\r\nb'));
});

test('newlines: either-preserve normalizes both CRLF and lone CR', () => {
  const schema = inferSchema(twoLineSchema({ newlines: 'either-preserve' }));
  assert.deepEqual(interpretParse(schema, 'a\r\nb'), { a: 'a', b: 'b' });
  assert.deepEqual(interpretParse(schema, 'a\rb'), { a: 'a', b: 'b' });
  assert.deepEqual(interpretParse(schema, 'a\nb'), { a: 'a', b: 'b' });
});
```

- [ ] **Step 2: Run test to verify it fails.**

Run: `npm run test -w @parser2/compiler 2>&1 | grep -E "newlines:|^# (tests|pass|fail|skipped)"`

Expected: at least 2 newlines tests FAIL (the CRLF and either-preserve cases). The 'LF default' test may already pass since it asserts a throw — but it's covering the right invariant.

- [ ] **Step 3: Extend `applyPreamble` in `interp/parse.ts`.** Replace the `// 3. Newline canonicalization (Task 8.3 wires this in).` placeholder with:

```ts
  // 3. Newline canonicalization.
  switch (schema.newlines) {
    case 'LF':
      break;
    case 'CRLF':
      input = input.replace(/\r\n/g, '\n');
      break;
    case 'either-preserve':
      input = input.replace(/\r\n?/g, '\n');
      break;
  }
```

- [ ] **Step 4: Run the newlines tests.**

Run: `npm run test -w @parser2/compiler 2>&1 | grep -E "newlines:|^# (tests|pass|fail|skipped)"`

Expected: 3 newlines tests PASS; compiler total = 344/344.

- [ ] **Step 5: Verify in-scope packages still build/parse.**

Run:
```bash
for pkg in css html markdown cron yaml-block; do
  echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo
done
```

Expected: all unchanged (every existing schema uses the default `newlines: 'LF'` which is a no-op).

- [ ] **Step 6: Commit.**

```bash
git add packages/compiler/src/interp/parse.ts \
        packages/compiler/test/newlines-preamble.test.ts
git commit -m "feat(interp): newline normalization in parse-entry preamble (Task 8.3)"
```

---

## Task 8.4: Interp preamble — case-insensitive input fold

**Why fourth:** Case folding is the final preamble step; it must come AFTER BOM / Unicode / newlines because lowercasing should operate on canonicalized text (e.g. `'﻿DIV'.toLowerCase()` would lowercase the BOM into nothing, so BOM strip runs first; NFD-decomposed letters lowercase differently than NFC-precomposed ones, so Unicode normalize runs first). This task is interp-only; codegen comes in Task 8.5.

**Files:**
- Modify: `packages/compiler/src/interp/parse.ts`
- Test: `packages/compiler/test/case-insensitive.test.ts`

- [ ] **Step 1: Failing test (interp portion only — emit portion lands in Task 8.5).** Create `packages/compiler/test/case-insensitive.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { $, defineSchema, ex, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { interpretParse } from '../src/interp/index.ts';

const tagSchema = defineSchema({
  rootType: 'Tag',
  caseSensitive: false,
  examples: [
    ex('<div>x</div>')
      .as('Tag')
      .span('<')
      .span('open', 'div').until('>')
      .span('>')
      .span('body', 'x').until('</')
      .span('</')
      .span('close', 'div').until('>')
      .span('>')
      .render('ast', { open: $.open, body: $.body, close: $.close })
      .render('source', tpl`<${$.open}>${$.body}</${$.close}>`)
      .build(),
  ],
});

test('case-insensitive interp: lowercase input matches as-is', () => {
  const schema = inferSchema(tagSchema);
  assert.deepEqual(
    interpretParse(schema, '<div>x</div>'),
    { open: 'div', body: 'x', close: 'div' },
  );
});

test('case-insensitive interp: uppercase input produces lowercase captures', () => {
  const schema = inferSchema(tagSchema);
  assert.deepEqual(
    interpretParse(schema, '<DIV>x</DIV>'),
    { open: 'div', body: 'x', close: 'div' },
  );
});

test('case-insensitive interp: mixed-case input produces lowercase captures', () => {
  const schema = inferSchema(tagSchema);
  assert.deepEqual(
    interpretParse(schema, '<DiV>x</dIv>'),
    { open: 'div', body: 'x', close: 'div' },
  );
});

test('case-insensitive interp: body content is also lowercased', () => {
  const schema = inferSchema(tagSchema);
  const result = interpretParse(schema, '<DIV>X</DIV>') as { body: string };
  assert.equal(result.body, 'x');
});

test('case-sensitive default: uppercase input fails to parse', () => {
  const caseSensitiveSchema = inferSchema(
    defineSchema({ ...tagSchema, caseSensitive: true }),
  );
  assert.throws(() => interpretParse(caseSensitiveSchema, '<DIV>x</DIV>'));
});
```

- [ ] **Step 2: Run test to verify it fails.**

Run: `npm run test -w @parser2/compiler 2>&1 | grep -E "case-insensitive interp|case-sensitive default|^# (tests|pass|fail|skipped)"`

Expected: 4 case-insensitive interp tests FAIL (input is matched case-sensitively today); 1 case-sensitive default test PASSES (default behavior unchanged).

- [ ] **Step 3: Extend `applyPreamble`.** Replace the `// 4. Case fold (Task 8.4 wires this in).` placeholder with:

```ts
  // 4. Case fold.
  if (!schema.caseSensitive) {
    input = input.toLowerCase();
  }
  return input;
```

(Drop the existing `return input;` line that comes after this if it now appears twice; the case-fold block should be the last statement before the existing `return input;`.)

- [ ] **Step 4: Run the case-insensitive tests.**

Run: `npm run test -w @parser2/compiler 2>&1 | grep -E "case-insensitive interp|case-sensitive default|^# (tests|pass|fail|skipped)"`

Expected: 5 case-related tests PASS; compiler total = 349/349.

- [ ] **Step 5: Verify in-scope packages still build/parse.**

Run:
```bash
for pkg in css html markdown cron yaml-block; do
  echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo
done
```

Expected: all unchanged (every existing schema uses the default `caseSensitive: true` — preamble is a no-op).

- [ ] **Step 6: Commit.**

```bash
git add packages/compiler/src/interp/parse.ts \
        packages/compiler/test/case-insensitive.test.ts
git commit -m "feat(interp): case-insensitive input fold at parse entry (Task 8.4)"
```

---

## Task 8.5: V2 codegen — emit matching parse-entry preamble

**Why fifth:** With the interp path proven across all four dials, the v2 emitter must produce generated parsers whose `__parse` body applies the same preamble. The trick: the emitter reads each dial from `schema` at codegen time and emits ONLY the transforms the schema opts in to. A schema using all defaults gets byte-identical generated code to pre-Phase-8.

**Files:**
- Modify: `packages/compiler/src/emit/v2/index.ts`
- Test: existing `compiler/test/case-insensitive.test.ts` + new emit-path test cases inside `compiler/test/unicode-preamble.test.ts` and `compiler/test/newlines-preamble.test.ts`

- [ ] **Step 1: Failing test.** Extend `packages/compiler/test/unicode-preamble.test.ts` with the following block at the bottom (BEFORE the file's final closing — append):

```ts
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emitV2Parser } from '../src/emit/v2/index.ts';

async function loadGeneratedParser(schemaDef: ReturnType<typeof defineSchema>) {
  const schema = inferSchema(schemaDef);
  const source = emitV2Parser(schema);
  const dir = mkdtempSync(join(tmpdir(), 'preamble-emit-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, source, 'utf8');
  return await import(file);
}

test('emit preamble: BOM allow strips leading U+FEFF', async () => {
  const mod = await loadGeneratedParser(makeLineSchema({ bom: 'allow' }));
  assert.equal(mod.render('﻿hello', { type: 'ast' }), 'hello');
});

test('emit preamble: BOM reject throws if BOM is present', async () => {
  const mod = await loadGeneratedParser(makeLineSchema({ bom: 'reject' }));
  assert.throws(() => mod.render('﻿hello', { type: 'ast' }), /BOM/);
});

test('emit preamble: unicode NFC normalizes NFD input', async () => {
  const schemaDef = defineSchema({
    rootType: 'Line',
    unicode: 'NFC',
    examples: [
      ex('café')
        .as('Line')
        .span('text', 'café').until('\n')
        .render('ast', $.text)
        .render('source', tpl`${$.text}`)
        .build(),
    ],
  });
  const mod = await loadGeneratedParser(schemaDef);
  assert.equal(mod.render('café', { type: 'ast' }), 'café');
});
```

Extend `packages/compiler/test/newlines-preamble.test.ts` similarly with a `loadGeneratedParser` helper (same shape) and two emit-side tests for `'CRLF'` and `'either-preserve'`. Copy the helper inline so each test file is self-contained.

Extend `packages/compiler/test/case-insensitive.test.ts` similarly with one emit-side test:

```ts
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emitV2Parser } from '../src/emit/v2/index.ts';

test('case-insensitive emit: uppercase input produces lowercase captures', async () => {
  const schema = inferSchema(tagSchema);
  const source = emitV2Parser(schema);
  const dir = mkdtempSync(join(tmpdir(), 'case-emit-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, source, 'utf8');
  const mod = await import(file);
  assert.deepEqual(
    mod.render('<DIV>x</DIV>', { type: 'ast' }),
    { open: 'div', body: 'x', close: 'div' },
  );
});
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npm run test -w @parser2/compiler 2>&1 | grep -E "emit preamble|case-insensitive emit|^# (tests|pass|fail|skipped)"`

Expected: the new emit-side tests FAIL — generated parsers don't apply the preamble yet.

- [ ] **Step 3: Read the current `emitPublicApi` body** (`packages/compiler/src/emit/v2/index.ts:216-238`):

```ts
function emitPublicApi(schema: InferredSchema, validateBody: string): string {
  const rootFn = parseFnName(schema.rootType);
  return `function __parse(input: string, options?: ParseOptions): unknown {
  const mode = options?.mode ?? 'fast';
  const state: State = {
    input,
    len: input.length,
    pos: 0,
    maxOff: 0,
    mode,
    lineStarts: mode === 'raws' ? computeLineStarts(input) : [],
    indentStack: new Int32Array(16),
    indentStackTop: 0,
  };
  const result = ${rootFn}(state);
  ...
```

- [ ] **Step 4: Add an `emitPreamble` helper** above `emitPublicApi`:

```ts
// Emit the Phase 8 input-normalization preamble inside __parse. Returns a
// (possibly empty) string of statements to splice in between the function
// header and the State construction. Each block is emitted ONLY if the
// schema dial differs from its default — a schema using all defaults gets
// an empty preamble, preserving byte-identical generated output.
function emitPreamble(schema: InferredSchema): string {
  const blocks: string[] = [];
  // BOM.
  switch (schema.bom) {
    case 'allow':
      blocks.push(`if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);`);
      break;
    case 'reject':
      blocks.push(`if (input.charCodeAt(0) === 0xfeff) throw new SyntaxError('parse: schema rejects BOM; input begins with U+FEFF');`);
      break;
    case 'require':
      blocks.push(`if (input.charCodeAt(0) !== 0xfeff) throw new SyntaxError('parse: schema requires BOM; input does not begin with U+FEFF');`);
      blocks.push(`input = input.slice(1);`);
      break;
  }
  // Unicode normalization.
  if (schema.unicode !== 'none') {
    blocks.push(`input = input.normalize(${JSON.stringify(schema.unicode)});`);
  }
  // Newline canonicalization.
  switch (schema.newlines) {
    case 'LF':
      break;
    case 'CRLF':
      blocks.push(`input = input.replace(/\\r\\n/g, '\\n');`);
      break;
    case 'either-preserve':
      blocks.push(`input = input.replace(/\\r\\n?/g, '\\n');`);
      break;
  }
  // Case fold.
  if (!schema.caseSensitive) {
    blocks.push(`input = input.toLowerCase();`);
  }
  return blocks.length === 0 ? '' : '  ' + blocks.join('\n  ') + '\n';
}
```

Note the `'\\r\\n'` in the source string above: codegen emits the regex `/\r\n/g` (single backslashes in the output), which requires `\\r\\n` in the TypeScript string literal here.

The `default: 'allow'` BOM case emits a runtime check that is technically not a strict no-op (BOM might never be there in practice). To keep generated code byte-identical for schemas that haven't touched the dial, special-case the default explicitly:

```ts
  // Special case: emit nothing when EVERY dial is at its default value.
  if (
    schema.bom === 'allow' &&
    schema.unicode === 'none' &&
    schema.newlines === 'LF' &&
    schema.caseSensitive === true
  ) {
    return '';
  }
```

Place this special-case at the TOP of `emitPreamble`, before the per-dial blocks. This guarantees that pre-Phase-8 schemas (which all use defaults) get the same generated output as before.

Wait — `bom: 'allow'` is the DEFAULT but it DOES require a runtime check (strip-if-present). So if the default emits the strip-if-present code, that's a runtime behavior change for ALL existing schemas (BOM was never stripped before). Resolve this by making the special-case check the dials that all CURRENT schemas use: at the time of writing, every in-tree schema sets nothing, so they get the defaults. The defaults are designed to be no-op-equivalent. BOM `'allow'`: strip-if-present. For schemas without a BOM in their input, this is a no-op. For schemas with a BOM, this changes behavior — but those would have failed before Phase 8 anyway. So the strip-if-present is a strict expansion of accepted inputs. **Keep the special-case.** It eliminates a tiny runtime cost for the all-defaults case.

- [ ] **Step 5: Splice the preamble into `emitPublicApi`.** Modify lines 216-235 to:

```ts
function emitPublicApi(schema: InferredSchema, validateBody: string): string {
  const rootFn = parseFnName(schema.rootType);
  const preamble = emitPreamble(schema);
  return `function __parse(input: string, options?: ParseOptions): unknown {
  const mode = options?.mode ?? 'fast';
${preamble}  const state: State = {
    input,
    len: input.length,
    pos: 0,
    maxOff: 0,
    mode,
    lineStarts: mode === 'raws' ? computeLineStarts(input) : [],
    indentStack: new Int32Array(16),
    indentStackTop: 0,
  };
  const result = ${rootFn}(state);
  if (result === null || state.pos !== input.length) {
    throw syntaxErrorAt(input, state.maxOff > state.pos ? state.maxOff : state.pos);
  }
  return result;
}

${validateBody}`;
}
```

Note `${preamble}` lands at column 0 inside the template literal because `emitPreamble` already prefixes lines with two spaces. If preamble is empty (defaults), the `${preamble}` substitutes to `''` and the `const state` line stays where it was.

- [ ] **Step 6: Run all preamble + case tests.**

Run: `npm run test -w @parser2/compiler 2>&1 | grep -E "emit preamble|case-insensitive emit|case-insensitive interp|^# (tests|pass|fail|skipped)"`

Expected: all preamble + case emit tests PASS; compiler total continues to climb.

- [ ] **Step 7: Verify byte-identical generated code for default schemas.**

Run:
```bash
git diff --stat packages/css/src/_generated/ packages/markdown/src/_generated/
```

Expected: empty (no changes). Generated CSS/markdown parsers must be byte-identical because their schemas use Phase 8 defaults. If `git diff` shows changes, the special-case in `emitPreamble` for all-defaults schemas is wrong — debug before continuing.

Run the regenerate step to confirm:

```bash
npm run generate -w @parser2/css 2>&1 | tail -5
npm run generate -w @parser2/markdown 2>&1 | tail -5
git diff --stat packages/css/src/_generated/ packages/markdown/src/_generated/
```

Expected: still empty after regenerate.

- [ ] **Step 8: Verify all in-scope schemas still pass.**

Run:
```bash
for pkg in parser compiler css html markdown cron yaml-block; do
  echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo
done
```

Expected: all green; counts climb only for `compiler` (the package that owns the new tests).

- [ ] **Step 9: Commit.**

```bash
git add packages/compiler/src/emit/v2/index.ts \
        packages/compiler/test/unicode-preamble.test.ts \
        packages/compiler/test/newlines-preamble.test.ts \
        packages/compiler/test/case-insensitive.test.ts
git commit -m "feat(compiler): v2 codegen emits BOM/Unicode/newlines/case preamble (Task 8.5)"
```

---

## Task 8.6: HTML schema gains `caseSensitive: false` + exit-gate test

**Why sixth:** First half of the Phase 8 exit gate. Adding `caseSensitive: false` to HTML's `defineSchema` call must make `<DIV>foo</DIV>` parse equivalently to `<div>foo</div>` — the master plan's stated criterion.

**Files:**
- Modify: `packages/html/src/schema.ts`
- Regenerate: `packages/html/src/_generated/parser.ts`
- Test: `packages/html/test/case-insensitive.test.ts`

- [ ] **Step 1: Failing test.** Create `packages/html/test/case-insensitive.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { render } from '../src/index.ts';

test('html case-insensitive: <DIV> and <div> produce identical AST', () => {
  const uppercaseAst = render('<DIV>foo</DIV>', { type: 'ast' });
  const lowercaseAst = render('<div>foo</div>', { type: 'ast' });
  assert.deepEqual(uppercaseAst, lowercaseAst);
});

test('html case-insensitive: <Script> opens a raw-text element', () => {
  // Tag name is mixed-case; the inside is a `<` that would normally start
  // a child element, but inside <script> raw text it's just data.
  const ast = render('<Script>var x = 1 < 2;</Script>', { type: 'ast' });
  // Sanity: the AST should not show a nested element for `< 2`. The
  // script body is captured as raw text.
  const json = JSON.stringify(ast);
  assert.ok(!json.includes('"<"'), 'no nested element for `<` inside <Script>');
});

test('html case-insensitive: attribute names are lowercased', () => {
  const ast = render('<a HREF="x">y</a>', { type: 'ast' }) as { [k: string]: unknown };
  const json = JSON.stringify(ast);
  // The attribute name in the AST should be 'href', not 'HREF'.
  assert.ok(json.includes('"href"'), `expected lowercase 'href' in AST: ${json}`);
  assert.ok(!json.includes('"HREF"'), `should not see uppercase 'HREF' in AST: ${json}`);
});

test('html case-insensitive: <BR> void element parses without close tag', () => {
  // BR is in VOID_TAGS — should parse without requiring </br>.
  const ast = render('<BR>', { type: 'ast' });
  assert.ok(ast, 'parse should succeed for <BR>');
});
```

- [ ] **Step 2: Run test to verify it fails.**

Run: `npm run test -w @parser2/html 2>&1 | grep -E "html case-insensitive|^# (tests|pass|fail|skipped)"`

Expected: 4 html-case-insensitive tests FAIL — current HTML schema is case-sensitive.

- [ ] **Step 3: Add `caseSensitive: false` to the HTML schema.** In `packages/html/src/schema.ts` find the `defineSchema({` call (around line 67) and add at the top of the object:

```ts
export default defineSchema({
  rootType: 'HtmlDoc',
  caseSensitive: false,
  // ...existing fields unchanged...
```

- [ ] **Step 4: Regenerate the HTML parser.**

Run: `npm run generate -w @parser2/html`

Expected output: success message; `packages/html/src/_generated/parser.ts` updated to include the case-fold line in `__parse`.

- [ ] **Step 5: Verify the regenerated parser includes the case fold.**

Run: `grep -A 5 "function __parse" packages/html/src/_generated/parser.ts | head -10`

Expected: the generated `__parse` body now contains `input = input.toLowerCase();`.

- [ ] **Step 6: Run the html case-insensitive tests.**

Run: `npm run test -w @parser2/html 2>&1 | grep -E "html case-insensitive|^# (tests|pass|fail|skipped)"`

Expected: 4 html-case-insensitive tests PASS; html total = 34/34.

- [ ] **Step 7: Run the FULL html test suite — Phase 8 must not regress existing HTML behavior.**

Run: `npm run test -w @parser2/html 2>&1 | tail -10`

Expected: `# tests 34 # pass 34 # fail 0`. If any pre-existing HTML test fails, debug before continuing — the lowercase preamble may have broken a test that relied on uppercase input being rejected, or that asserted on a captured uppercase tag name.

- [ ] **Step 8: Verify all in-scope packages still pass.**

Run:
```bash
for pkg in parser compiler css html markdown cron yaml-block; do
  echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo
done
```

Expected: all green; only html count changed.

- [ ] **Step 9: Commit.**

```bash
git add packages/html/src/schema.ts \
        packages/html/src/_generated/parser.ts \
        packages/html/test/case-insensitive.test.ts
git commit -m "feat(html): schema gains caseSensitive:false; <DIV> parses as <div> (Task 8.6)"
```

---

## Task 8.7: Unicode round-trip exit gate — inline email-like schema

**Why seventh:** Second half of the Phase 8 exit gate. The master plan calls for "Unicode normalization round-trips for an email-grammar example." Use an inline test schema rather than a full package — Phase 8 dials are simple enough that a separate exit-gate package (like yaml-block for Phase 7) would be overkill. The schema covers `local@domain` with diacritic handling; the test feeds NFD input and asserts NFC capture + stable round-trip.

**Files:**
- Test: `packages/compiler/test/unicode-roundtrip.test.ts`

- [ ] **Step 1: Failing test.** Create `packages/compiler/test/unicode-roundtrip.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { $, defineSchema, ex, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { interpretParse } from '../src/interp/index.ts';
import { emitV2Parser } from '../src/emit/v2/index.ts';

const emailSchema = defineSchema({
  rootType: 'Email',
  unicode: 'NFC',
  examples: [
    ex('user@example.com')
      .as('Email')
      .span('local', 'user').until('@')
      .span('@')
      .span('domain', 'example.com').until('\n')
      .render('ast', { type: 'email', local: $.local, domain: $.domain })
      .render('source', tpl`${$.local}@${$.domain}`)
      .build(),
  ],
});

async function loadEmitted() {
  const schema = inferSchema(emailSchema);
  const source = emitV2Parser(schema);
  const dir = mkdtempSync(join(tmpdir(), 'email-emit-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, source, 'utf8');
  return await import(file);
}

const NFC_LOCAL = 'josé';       // 'josé' precomposed (single code point)
const NFD_LOCAL = 'josé'; // 'jose' + combining acute

test('unicode roundtrip interp: NFD input → NFC capture', () => {
  const schema = inferSchema(emailSchema);
  const ast = interpretParse(schema, `${NFD_LOCAL}@example.com`);
  assert.deepEqual(ast, { type: 'email', local: NFC_LOCAL, domain: 'example.com' });
});

test('unicode roundtrip interp: NFC input is identity', () => {
  const schema = inferSchema(emailSchema);
  const ast = interpretParse(schema, `${NFC_LOCAL}@example.com`);
  assert.deepEqual(ast, { type: 'email', local: NFC_LOCAL, domain: 'example.com' });
});

test('unicode roundtrip emit: NFD input through generated parser → NFC capture', async () => {
  const mod = await loadEmitted();
  const ast = mod.render(`${NFD_LOCAL}@example.com`, { type: 'ast' });
  assert.deepEqual(ast, { type: 'email', local: NFC_LOCAL, domain: 'example.com' });
});

test('unicode roundtrip emit: stringify produces NFC source', async () => {
  const mod = await loadEmitted();
  const ast = mod.render(`${NFD_LOCAL}@example.com`, { type: 'ast' });
  const source = mod.stringify(ast, { type: 'ast' });
  assert.equal(source, `${NFC_LOCAL}@example.com`);
});

test('unicode roundtrip emit: re-parse of stringified source is stable', async () => {
  const mod = await loadEmitted();
  // First round-trip: NFD → NFC.
  const firstAst = mod.render(`${NFD_LOCAL}@example.com`, { type: 'ast' });
  const firstSource = mod.stringify(firstAst, { type: 'ast' });
  // Second round-trip: NFC → NFC (identity).
  const secondAst = mod.render(firstSource, { type: 'ast' });
  const secondSource = mod.stringify(secondAst, { type: 'ast' });
  assert.equal(secondSource, firstSource);
  assert.deepEqual(secondAst, firstAst);
});
```

- [ ] **Step 2: Run test to verify all 5 pass.**

Run: `npm run test -w @parser2/compiler 2>&1 | grep -E "unicode roundtrip|^# (tests|pass|fail|skipped)"`

Expected: all 5 unicode-roundtrip tests PASS on first run — the preamble was already wired in Tasks 8.2 + 8.5. If any fail, the failure points at a Phase 8 gap surfaced by a richer example (a real round-trip rather than a parse-only check). Debug before continuing.

- [ ] **Step 3: Verify all in-scope packages still pass.**

Run:
```bash
for pkg in parser compiler css html markdown cron yaml-block; do
  echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo
done
```

Expected: all green; compiler total includes the new 5 unicode-roundtrip tests.

- [ ] **Step 4: Commit.**

```bash
git add packages/compiler/test/unicode-roundtrip.test.ts
git commit -m "test(compiler): email-grammar unicode round-trip exit-gate (Task 8.7)"
```

---

## Task 8.8: Documentation closeout

**Why last:** Phase 8 implementation is complete; document what landed, what's deferred, and what the next phase (Phase 9) inherits.

**Files:**
- Modify: `docs/v2-migration-status.md`
- Modify: `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md`
- New: `docs/superpowers/plans/2026-05-30-next-session-handoff.md` (optional — only if Phase 9 won't start in the same session)

- [ ] **Step 1: Add Phase 8 closeout section to `docs/v2-migration-status.md`.** After the existing `## Phase 7 closeout (2026-05-27)` section (ends around line 347), insert a `## Phase 8 closeout (YYYY-MM-DD)` section. Mirror the structure of Phase 7's closeout:

```markdown
## Phase 8 closeout (YYYY-MM-DD)

Schema-level Unicode / case / BOM / newlines dials land. Adding them is a
one-line change in `defineSchema(...)`; the compiler bakes a per-dial
preamble into the generated `__parse` function (and into the reference
interpreter). Schemas using all defaults get byte-identical generated code
to pre-Phase-8. The HTML schema opts in to `caseSensitive: false` —
`<DIV>foo</DIV>` and `<div>foo</div>` produce identical ASTs.

### Design summary

Four orthogonal input transforms applied once at parse entry, in order:

1. **BOM handling** (`bom: 'allow' | 'reject' | 'require'`, default `'allow'`).
   Strips a leading U+FEFF, throws on presence, or throws on absence.
2. **Unicode normalization** (`unicode: 'NFC' | 'NFD' | 'none'`, default `'none'`).
   Calls `input.normalize(form)` once when set.
3. **Newline canonicalization** (`newlines: 'LF' | 'CRLF' | 'either-preserve'`,
   default `'LF'`). Normalizes line endings to `\n`.
4. **Case fold** (`caseSensitive: boolean`, default `true`). Applies
   `input.toLowerCase()` when `false`.

Zero runtime overhead at the default values: the v2 emitter short-circuits
when all four dials are at defaults, emitting an empty preamble. Schemas
opt into transforms one at a time; each opt-in is one O(n) string call at
parse entry, no per-token cost.

The reference interpreter (`packages/compiler/src/interp/parse.ts`) and the
v2 emitter (`packages/compiler/src/emit/v2/index.ts`) carry matching
preamble logic. Bytecode backend stays untouched — cron remains the only
bytecode-tested schema (Phase 6 follow-up #4 / Phase 7 follow-up #3).

### What landed (Phase 8)

| Task | Commit(s) | What landed |
| --- | --- | --- |
| 8.1 | [SHA] | `BomPolicy`, `UnicodeForm`, `NewlinePolicy` types in `parser/src/types.ts`; four new fields on `SchemaDef`/`SchemaInput`/`InferredSchema`; defaults wired through `defineSchema` + `inferSchema`. |
| 8.2 | [SHA] | `applyPreamble` helper in `interp/parse.ts` handles BOM + Unicode normalize at parse entry. |
| 8.3 | [SHA] | `applyPreamble` extended for newline canonicalization (`LF`/`CRLF`/`either-preserve`). |
| 8.4 | [SHA] | `applyPreamble` extended for `input.toLowerCase()` when `caseSensitive: false`. |
| 8.5 | [SHA] | `emitPreamble` in `emit/v2/index.ts` emits matching preamble into generated `__parse` body. Special-cases all-defaults to emit nothing (byte-identical output for unchanged schemas). |
| 8.6 | [SHA] | HTML schema opts in to `caseSensitive: false`; regenerated `_generated/parser.ts`; 4 new tests in `packages/html/test/case-insensitive.test.ts`. |
| 8.7 | [SHA] | 5 round-trip tests in `compiler/test/unicode-roundtrip.test.ts` for an inline email-like schema with `unicode: 'NFC'`. |
| 8.8 | (this commit) | Documentation closeout. |

### Phase 8 exit gate status

| Criterion | Status | Note |
| --- | --- | --- |
| HTML schema parses `<DIV>` and `<div>` equivalently with `caseSensitive: false` | **PASS** | `packages/html/test/case-insensitive.test.ts` — mixed-case tags, attribute names, void elements, and raw-text containers (script) all parse to identical ASTs. |
| Unicode normalization round-trips for an email-grammar example | **PASS** | `packages/compiler/test/unicode-roundtrip.test.ts` — NFD input produces NFC captures; second-pass round-trip is byte-stable. |

### Phase 8 follow-ups (deferrable)

Real gaps that the exit-gate tests work around or don't exercise. None block Phase 9.

1. **Bytecode backend has no preamble support.** The bytecode encoder ignores
   the four new dials. Adding preamble to the bytecode runtime entry
   (`packages/compiler/src/emit/bytecode/runtime.ts`) + encoder is a
   follow-up. Bytecode stays bound to cron, which uses Phase 8 defaults.

2. **`caseSensitive: false` is ASCII-only-correct.** `input.toLowerCase()`
   uses Unicode default case mapping (locale-independent), which is right
   for ASCII-only tag names. Grammars with non-ASCII tokens (e.g. Greek
   letters in math notation) may hit edge cases — Turkish dotless-i is the
   canonical gotcha but is not reachable via the default-case-mapping path
   (only `toLocaleLowerCase('tr')` triggers it). Documented as a known
   limitation; no schema in scope exercises non-ASCII case folding.

3. **`newlines: 'either-preserve'` is value-stable but not byte-stable for
   CRLF input.** Round-trip emits LF only. The "preserve" in the name is a
   misnomer kept for master-plan compatibility; true byte preservation
   would require per-newline metadata in captures and is out of scope.

4. **`bom: 'allow'` changes behavior for inputs with a BOM.** Pre-Phase-8
   schemas would fail on BOM-prefixed input; post-Phase-8 they strip the
   BOM silently. This is a strict expansion of accepted inputs (no schema
   that previously parsed now fails). Documented for awareness.

5. **No per-pattern case-insensitive escape hatch.** Phase 8 dials are
   schema-wide. A schema that wants some literals matched case-insensitively
   while others stay case-sensitive must use the existing `.oneOf({
   caseInsensitive: true })` refinement, which is value-level (not
   input-level) — it lowercases the candidate AND the captured token before
   comparison. This is unchanged by Phase 8.

6. **Preamble cost is O(n) per parse call.** For very large inputs with many
   parse calls (e.g. streaming-style use), the per-call `.normalize` +
   `.toLowerCase` cost may dominate. The schema-level dial design assumes
   per-document parsing, not per-token / per-chunk. Documented as a known
   performance characteristic.

7. **Forward `render(input, opts)` path inherits preamble for free** (via
   internal `__parse` call) but the round-trip theorem (`checkRoundTrip` in
   `compiler/src/check/round-trip.ts`) does NOT exercise non-canonical
   inputs. Schemas using `caseSensitive: false` or `newlines:
   'either-preserve'` must write examples in canonical form
   (lowercase, LF) for the theorem to hold. Non-canonical inputs are tested
   via separate package-level tests.

## Where to next

Phases 1 + 1.5 + 5 + 6 + 7 + 8 are closed. Next phase per the engine
overhaul plan is Phase 9 — DSL clean break (`ex()` → `relation()`). Phase
9 is cosmetic on top of the working engine and is gated on a re-plan
session to fold in lessons from Phases 5-8 (fusion + indent + dials).
```

(Replace `YYYY-MM-DD` with today's date and `[SHA]` with each task's actual short SHA before committing.)

- [ ] **Step 2: Mark Phase 8 closed in the master plan.** In `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md`, find the Phase 8 section (lines ~774-795). At the very END of that section (before the `---` that begins the Phase 9 section), append:

```markdown
**Status: CLOSED (YYYY-MM-DD).** See `docs/v2-migration-status.md` § "Phase 8 closeout" and `docs/superpowers/plans/2026-05-29-phase-8-unicode-case.md` for the executed task breakdown.
```

- [ ] **Step 3: (Optional) Draft next-session handoff.** If Phase 9 will not be started in this session, create `docs/superpowers/plans/2026-05-30-next-session-handoff.md` mirroring the structure of `2026-05-29-next-session-handoff.md`:
  - Working directory + state verification commands
  - Pre-Phase-9 housekeeping (stashes, branches, push status — note that there is no remote configured)
  - Where to read first (master plan lines 797-836, this Phase 8 plan, AGENTS.md)
  - Phase 8 closeout summary (link to the new section in `v2-migration-status.md`)
  - Phase 9 sketch (master plan lines 797-836: rename `ex()` → `relation()`; reshape encodings as co-equal slots; rewrite css/html/markdown schemas; delete `ex()`)
  - Phase 6/7/8 follow-ups still open (link to each)
  - Workflow pattern (validated through Phases 1.5/5/6/7/8)
  - First actions in next session

If Phase 9 starts immediately in the same session, skip Step 3 — the master plan already provides the architectural sketch and Phase 9 is the last phase.

- [ ] **Step 4: Verify full test baseline one more time.**

Run:
```bash
for pkg in parser compiler css html markdown cron yaml-block; do
  echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo
done
```

Expected: parser 30/30, compiler at the post-Phase-8 count (335 baseline + ~24 new = ~359), css 56/57, html 34/34, markdown 76/76, cron 15/15, yaml-block 9/9.

- [ ] **Step 5: Commit closeout docs.**

```bash
git add docs/v2-migration-status.md docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md
# If handoff doc was created:
git add docs/superpowers/plans/2026-05-30-next-session-handoff.md
git commit -m "docs: Phase 8 Unicode/case/BOM/newlines closeout (Task 8.8)"
```

- [ ] **Step 6: Final state check.**

Run: `git log --oneline -12`

Expected: 8 Phase 8 task commits (8.1-8.8) on top of the prior 19 commits (Phase 7 closeout + handoff + plan).

---

## Self-review

1. **Spec coverage:**
   - "Schema-level dials baked at codegen, zero runtime overhead" → Task 8.1 (data shape) + Task 8.5 (codegen short-circuit when all defaults).
   - "Normalize input before scan when `unicode !== 'none'`" → Task 8.2 (interp) + Task 8.5 (emit).
   - "Lowercased-compare table for literals when `caseSensitive: false`" → Task 8.4 (interp) + Task 8.5 (emit). Implementation choice: lowercase the input rather than the literals (simpler, one-time O(n) cost, captures return lowercased text which is what callers want for canonical-form ASTs).
   - "Newline normalization at tokenize time for `newlines: 'either-preserve'`" → Task 8.3 (interp) + Task 8.5 (emit). Applied at parse entry, not tokenize time — same effect, simpler location.
   - "BOM handling at parse entry" → Task 8.2 (interp) + Task 8.5 (emit).
   - "HTML schema parses `<DIV>` and `<div>` equivalently with `caseSensitive: false`" → Task 8.6 (exit gate).
   - "Unicode normalization round-trips for an email-grammar example" → Task 8.7 (exit gate).

2. **Placeholder scan:** No "TBD", "TODO", or "implement appropriately" in any step. Every code block is complete. The `[SHA]` placeholders in the closeout-doc template are intentional — they're filled in when each task lands.

3. **Type consistency:**
   - `BomPolicy`, `UnicodeForm`, `NewlinePolicy` declared in Task 8.1, used in Tasks 8.2-8.5.
   - `applyPreamble` declared in Task 8.2, extended in Tasks 8.3 + 8.4.
   - `emitPreamble` declared in Task 8.5, no further mutations.
   - `schema.bom` / `schema.unicode` / `schema.newlines` / `schema.caseSensitive` are the single source of truth; both interp and emit read the same field names from `InferredSchema`.

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-29-phase-8-unicode-case.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, two-stage review per task (spec compliance, then code quality). Mirrors how Phases 6 + 7 were executed.

2. **Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch with checkpoints. Faster but loses the fresh-eyes property of per-task subagent dispatch.

**Important deferred decisions** (not blocking, surface during execution if needed):

- Whether to commit the optional next-session handoff (Step 3 of Task 8.8) or move straight into Phase 9 in the same session.
- Whether to drop the remaining `stash@{1}` and `stash@{2}` (left in place from prior sessions; not surfaced as relevant during Phase 7).
