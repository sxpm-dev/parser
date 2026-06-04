# Discriminator-Dispatch Codegen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop probing every alt of a multi-alt relation serially when the alts share a literal-prefix + `ident-with-oneOf` shape. Capture the discriminator's text in the dispatcher and route to only the alts whose `oneOf` could match.

**Architecture:** Detect the "shared literal + discriminator-ident + oneOf" shape at codegen time (`detectSharedDispatch`). When detected, emit a dispatcher that ws-skips, peeks at the discriminator's bytes *without* committing `state.pos`, computes the lowercased value, then `switch`es to call only the matching alts in declaration order — falling back to catch-all alts (alts without `oneOf` at that position) if no tag-bucket alt succeeds. Alt bodies are unchanged; each still does its own prologue and rewinds on failure. This is intentionally Path 1 (peek-and-route) not Path 2 (factor the prologue out of alts) — Path 1 is a strict superset of safety: any alt that could match before will be called with identical state.

**Tech Stack:** TypeScript compiler emit code in `packages/compiler/src/emit/v2/`. Node's built-in `test`/`assert` runner.

**Non-goals (for this plan):**
- Removing the redundant prologue work *inside* each alt body. That's Path 2; do it later as a follow-up if Path 1's win isn't sufficient.
- Touching the captures→AST path (`__build_X_N_ast`).
- Schema changes.

---

## File Structure

- **Create:** `packages/compiler/src/emit/v2/shared-dispatch.ts` — owns detection (`detectSharedDispatch`) and emission (`emitSharedDispatcher`) for the new pattern. Self-contained so it can be ripped out / rewritten without disturbing the existing dispatcher.
- **Modify:** `packages/compiler/src/emit/v2/dispatch.ts` — at the top of `emitDispatcher`, try `detectSharedDispatch`; if it returns non-null, use `emitSharedDispatcher` and return. Otherwise fall through to today's `tryEmitBytePrefix` / serial-probe path.
- **Create:** `packages/compiler/test/shared-dispatch.test.ts` — unit tests for `detectSharedDispatch` only. (Codegen correctness is covered by `packages/parser/test/generated-parser-ir.golden.json` + every package's existing parse tests.)
- **Modify:** `packages/parser/test/generated-parser-ir.golden.json` — update the html (and any other affected) hash after regeneration.

---

## Task 1: Add `detectSharedDispatch` with unit tests

**Files:**
- Create: `packages/compiler/src/emit/v2/shared-dispatch.ts`
- Create: `packages/compiler/test/shared-dispatch.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/compiler/test/shared-dispatch.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';
import type { NodeTypeInfo, Production, ResolvedSpan } from '../src/model.ts';
import { detectSharedDispatch } from '../src/emit/v2/shared-dispatch.ts';

function literal(text: string): ResolvedSpan {
  return { class: 'literal', text, refinements: [], modifiers: [], recursiveRoles: [] };
}

function identOneOf(name: string, values: readonly string[]): ResolvedSpan {
  return {
    name,
    class: 'ident',
    refinements: [
      { name: 'html', args: [] },
      { name: 'oneOf', args: [values] },
    ],
    modifiers: [],
    recursiveRoles: [],
  };
}

function identAny(name: string): ResolvedSpan {
  return {
    name,
    class: 'ident',
    refinements: [{ name: 'html', args: [] }],
    modifiers: [],
    recursiveRoles: [],
  };
}

function prod(spans: ResolvedSpan[]): Production {
  return {
    nodeType: 'X',
    source: { input: '' } as Production['source'],
    spans,
    renders: new Map(),
  };
}

test('detectSharedDispatch returns null for single-alt info', () => {
  const info: NodeTypeInfo = { name: 'X', productions: [prod([literal('<'), identAny('tag')])] };
  assert.equal(detectSharedDispatch(info), null);
});

test('detectSharedDispatch returns null when alts do not share literal prefix', () => {
  const info: NodeTypeInfo = {
    name: 'X',
    productions: [
      prod([literal('<'), identOneOf('tag', ['a'])]),
      prod([literal('['), identOneOf('tag', ['b'])]),
    ],
  };
  assert.equal(detectSharedDispatch(info), null);
});

test('detectSharedDispatch returns null when no alt has oneOf at the discriminator position', () => {
  const info: NodeTypeInfo = {
    name: 'X',
    productions: [
      prod([literal('<'), identAny('tag')]),
      prod([literal('<'), identAny('tag')]),
    ],
  };
  assert.equal(detectSharedDispatch(info), null);
});

test('detectSharedDispatch picks up html-shape: literal + ident().oneOf()', () => {
  const info: NodeTypeInfo = {
    name: 'X',
    productions: [
      prod([literal('<'), identOneOf('tag', ['script', 'style'])]), // alt 0
      prod([literal('<'), identOneOf('tag', ['li'])]),              // alt 1
      prod([literal('<'), identOneOf('tag', ['tr'])]),              // alt 2
      prod([literal('<'), identAny('tag')]),                        // alt 3 (catch-all)
    ],
  };
  const result = detectSharedDispatch(info);
  assert.ok(result);
  assert.equal(result.prefixLen, 2);
  assert.equal(result.discriminatorIdx, 1);
  assert.deepEqual([...result.tagToAlts.keys()].sort(), ['li', 'script', 'style', 'tr']);
  assert.deepEqual(result.tagToAlts.get('script'), [0]);
  assert.deepEqual(result.tagToAlts.get('li'), [1]);
  assert.deepEqual(result.catchAllAlts, [3]);
});

test('detectSharedDispatch groups overlapping oneOf values in declaration order', () => {
  // void-element pattern: two alts share the same oneOf set (different suffix)
  const info: NodeTypeInfo = {
    name: 'X',
    productions: [
      prod([literal('<'), identOneOf('tag', ['br', 'hr'])]), // alt 0 (void)
      prod([literal('<'), identOneOf('tag', ['br', 'hr'])]), // alt 1 (void self-close)
      prod([literal('<'), identAny('tag')]),                  // alt 2 (catch-all)
    ],
  };
  const result = detectSharedDispatch(info);
  assert.ok(result);
  assert.deepEqual(result.tagToAlts.get('br'), [0, 1]);
  assert.deepEqual(result.tagToAlts.get('hr'), [0, 1]);
  assert.deepEqual(result.catchAllAlts, [2]);
});

test('detectSharedDispatch lowercases oneOf values for the routing key', () => {
  const info: NodeTypeInfo = {
    name: 'X',
    productions: [
      prod([literal('<'), identOneOf('tag', ['SCRIPT', 'Style'])]),
      prod([literal('<'), identAny('tag')]),
    ],
  };
  const result = detectSharedDispatch(info);
  assert.ok(result);
  assert.deepEqual([...result.tagToAlts.keys()].sort(), ['script', 'style']);
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

```bash
cd /Users/valerii/Develop/parser3_codex
node --test --import tsx packages/compiler/test/shared-dispatch.test.ts 2>&1 | head -30
```

Expected: failure with `Cannot find module '.../shared-dispatch.ts'` (the module does not exist yet).

- [ ] **Step 3: Create the implementation**

```typescript
// packages/compiler/src/emit/v2/shared-dispatch.ts

import type { NodeTypeInfo, Production, Refinement, ResolvedSpan } from '../../model.ts';

/**
 * When a relation's alts share a literal prefix and split on a `.oneOf(...)`
 * over a single captured `ident` span, we can emit a dispatcher that peeks at
 * the ident's bytes once and `switch`es to call only the alts whose oneOf
 * would plausibly match. Today every alt is probed serially and each re-scans
 * + slices + lowercases the same ident — the bigger N is, the more wasted
 * substring allocations.
 *
 * This module is the detection half: it returns a SharedDispatch description
 * when the shape is matched, or null when it isn't. The emit half lives in
 * `emitSharedDispatcher` below.
 */
export interface SharedDispatch {
  /** Number of spans at the start of every alt that are byte-identical
   *  (modulo the oneOf set on the discriminator). Always >= 2. */
  readonly prefixLen: number;
  /** Index into spans[] where the discriminator (ident span with oneOf on
   *  at least one alt) lives. Always equal to prefixLen - 1. */
  readonly discriminatorIdx: number;
  /** Map from lowercased oneOf value to the list of alt indices whose
   *  oneOf contains it, preserved in declaration order. */
  readonly tagToAlts: ReadonlyMap<string, ReadonlyArray<number>>;
  /** Alt indices whose discriminator span has NO oneOf — i.e. they accept
   *  any ident at the discriminator position. Tried after tag-bucket alts. */
  readonly catchAllAlts: ReadonlyArray<number>;
}

export function detectSharedDispatch(info: NodeTypeInfo): SharedDispatch | null {
  const prods = info.productions;
  if (prods.length < 2) return null;

  // Phase 1: find the longest byte-identical prefix across alts, where each
  // span's class/text/refinements/modifiers must match exactly between alts.
  // The ONE exception is the oneOf refinement on the last prefix span (the
  // discriminator) — those are allowed to differ; the whole point of this
  // optimization is to dispatch on them.
  const first = prods[0]!.spans;
  let prefixLen = 0;
  for (let i = 0; i < first.length; i++) {
    const isLastTried = i === first.length - 1;
    if (
      prods.every((p) => i < p.spans.length && spansMatchIgnoringOneOfAt(first[i]!, p.spans[i]!, /* allowOneOfMismatch */ true))
    ) {
      prefixLen = i + 1;
    } else {
      break;
    }
    // We only need to detect up through the discriminator span — go one
    // more and stop (the body after the discriminator is allowed to differ).
    if (isLastTried) break;
  }

  if (prefixLen < 2) return null;

  // Phase 2: the discriminator is the last span of the shared prefix. It
  // must be an `ident` span (the dispatcher needs to scan it identifier-
  // style), and at least one alt must carry a oneOf at that position.
  const discriminatorIdx = prefixLen - 1;
  const discriminatorClass = first[discriminatorIdx]!.class;
  if (discriminatorClass !== 'ident') return null;

  const tagToAlts = new Map<string, number[]>();
  const catchAllAlts: number[] = [];
  let anyOneOf = false;
  for (let altIdx = 0; altIdx < prods.length; altIdx++) {
    const span = prods[altIdx]!.spans[discriminatorIdx]!;
    const oneOf = findOneOfValues(span.refinements);
    if (oneOf === null) {
      catchAllAlts.push(altIdx);
      continue;
    }
    anyOneOf = true;
    for (const raw of oneOf) {
      const key = raw.toLowerCase();
      const bucket = tagToAlts.get(key);
      if (bucket) bucket.push(altIdx);
      else tagToAlts.set(key, [altIdx]);
    }
  }
  if (!anyOneOf) return null;

  return { prefixLen, discriminatorIdx, tagToAlts, catchAllAlts };
}

/** True if two spans are structurally identical, optionally tolerating a
 *  mismatch in their `oneOf` refinement (used for the discriminator span).
 *  All other refinements, modifiers, class/text/recursiveRoles must match. */
function spansMatchIgnoringOneOfAt(
  a: ResolvedSpan,
  b: ResolvedSpan,
  allowOneOfMismatch: boolean,
): boolean {
  if (a.class !== b.class) return false;
  if (a.text !== b.text) return false;
  if (!arraysEqual(a.modifiers, b.modifiers, sameModifier)) return false;
  if (!arraysEqual(a.recursiveRoles, b.recursiveRoles, (x, y) => x === y)) return false;
  // Refinements: compare order-sensitively, but the oneOf entry is exempt.
  const ar = allowOneOfMismatch ? a.refinements.filter((r) => r.name !== 'oneOf') : a.refinements;
  const br = allowOneOfMismatch ? b.refinements.filter((r) => r.name !== 'oneOf') : b.refinements;
  return arraysEqual(ar, br, sameRefinement);
}

function sameModifier(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sameRefinement(a: Refinement, b: Refinement): boolean {
  return a.name === b.name && JSON.stringify(a.args) === JSON.stringify(b.args);
}

function arraysEqual<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>, eq: (x: T, y: T) => boolean): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!eq(a[i]!, b[i]!)) return false;
  return true;
}

function findOneOfValues(refinements: ReadonlyArray<Refinement>): ReadonlyArray<string> | null {
  for (const r of refinements) {
    if (r.name !== 'oneOf') continue;
    const args = r.args;
    if (!Array.isArray(args) || args.length !== 1) continue;
    const list = args[0];
    if (!Array.isArray(list)) continue;
    if (list.every((v) => typeof v === 'string')) return list as ReadonlyArray<string>;
  }
  return null;
}
```

> Note: `Production`, `ResolvedSpan`, `Refinement`, `NodeTypeInfo` are exported from `packages/compiler/src/model.ts`. If `Refinement` isn't exported, add it to that file's exports.

- [ ] **Step 4: Run the tests, confirm they pass**

```bash
cd /Users/valerii/Develop/parser3_codex
node --test --import tsx packages/compiler/test/shared-dispatch.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/compiler/src/emit/v2/shared-dispatch.ts packages/compiler/test/shared-dispatch.test.ts
git commit -m "feat(compiler): detect shared-prefix oneOf-discriminated alts"
```

---

## Task 2: Implement `emitSharedDispatcher`

**Files:**
- Modify: `packages/compiler/src/emit/v2/shared-dispatch.ts` (add the emit fn)
- No test file — codegen correctness is covered by the parse-test suite (Task 4) and the golden hash gate.

- [ ] **Step 1: Add the emit function to `shared-dispatch.ts`**

Append to `packages/compiler/src/emit/v2/shared-dispatch.ts`:

```typescript
// --- Emit ---

/**
 * Emit the body of the dispatcher when the relation matches the shared-
 * dispatch shape. Returns the function source (caller wraps it in
 * `function ${name}(state: State): unknown { ... }`).
 *
 * Shape:
 *   1. ws-skip
 *   2. first-byte gate on the leading literal (e.g. `<`)
 *   3. peek the discriminator ident (start/end, no state.pos commit)
 *   4. lowercased substring + switch → call matching alts in declaration order
 *   5. fall through to catch-all alts in declaration order
 *
 * Each alt call is the existing `parseX__altN(state)` — alt bodies are
 * unchanged; they still do their own prologue and rewind on failure. We
 * just stop probing alts whose oneOf couldn't match.
 */
export function emitSharedDispatcher(
  parseFnName: string,
  altFnNames: ReadonlyArray<string>,
  dispatch: SharedDispatch,
  leadingLiteral: string,
): string {
  // Build the cases. Multiple oneOf values can route to the same alt list
  // (e.g. void-tag pattern). Emit one `case 'br':` per value, then a single
  // body that probes the alts in declaration order.
  const grouped = groupCasesByAltList(dispatch.tagToAlts);

  const caseLines: string[] = [];
  for (const { tags, alts } of grouped) {
    for (const tag of tags) caseLines.push(`    case ${jsStringLiteral(tag)}:`);
    // Strip leading `case X:` newlines — last tag in this group falls into the body.
    caseLines.push('    {');
    for (const altIdx of alts) {
      caseLines.push(`      { const r = ${altFnNames[altIdx]}(state); if (r !== null) return r; }`);
    }
    caseLines.push('      break;');
    caseLines.push('    }');
  }

  const catchAllLines: string[] = [];
  for (const altIdx of dispatch.catchAllAlts) {
    catchAllLines.push(`  { const r = ${altFnNames[altIdx]}(state); if (r !== null) return r; }`);
  }

  const firstByte = leadingLiteral.charCodeAt(0);
  const leadingLen = leadingLiteral.length;
  const leadingMatchExpr = leadingLen === 1
    ? `input.charCodeAt(off) === ${firstByte}`
    : `input.startsWith(${jsStringLiteral(leadingLiteral)}, off)`;

  // The peek logic mirrors `classScanCode('ident')`: an ident-start char
  // followed by zero or more ident-part chars. We use the raw isCss helpers
  // already in the runtime so we don't diverge from the alt-body scan.
  return [
    `  const input = state.input;`,
    `  const len = state.len;`,
    `  let off = state.pos;`,
    `  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }`,
    `  state.pos = off;`,
    `  if (off >= len) return null;`,
    `  if (!(${leadingMatchExpr})) return null;`,
    `  let __peekOff = off + ${leadingLen};`,
    `  while (__peekOff < len) { const c = input.charCodeAt(__peekOff); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { __peekOff++; continue; } break; }`,
    `  if (__peekOff >= len || !isCssIdentStart(input.charCodeAt(__peekOff))) {`,
    ...catchAllLines.map((l) => '  ' + l),
    `    return null;`,
    `  }`,
    `  const __tagStart = __peekOff;`,
    `  __peekOff++;`,
    `  while (__peekOff < len && isCssIdentPart(input.charCodeAt(__peekOff))) __peekOff++;`,
    `  const __dispatchTag = input.slice(__tagStart, __peekOff).toLowerCase();`,
    `  switch (__dispatchTag) {`,
    ...caseLines,
    `  }`,
    ...catchAllLines,
    `  return null;`,
  ].join('\n');
}

interface CaseGroup {
  /** Tags that share the same alt-probe list (deduplicated). */
  tags: string[];
  alts: ReadonlyArray<number>;
}

function groupCasesByAltList(tagToAlts: ReadonlyMap<string, ReadonlyArray<number>>): CaseGroup[] {
  const byKey = new Map<string, CaseGroup>();
  // Stable insertion order so the emitted JS stays deterministic.
  for (const [tag, alts] of tagToAlts) {
    const key = alts.join(',');
    let group = byKey.get(key);
    if (!group) {
      group = { tags: [], alts };
      byKey.set(key, group);
    }
    group.tags.push(tag);
  }
  return [...byKey.values()];
}

function jsStringLiteral(s: string): string {
  return JSON.stringify(s);
}
```

- [ ] **Step 2: Confirm the existing detection tests still pass**

```bash
cd /Users/valerii/Develop/parser3_codex
node --test --import tsx packages/compiler/test/shared-dispatch.test.ts
```

Expected: still 6 passes (we only added a function; we did not change detection behavior).

- [ ] **Step 3: Commit**

```bash
git add packages/compiler/src/emit/v2/shared-dispatch.ts
git commit -m "feat(compiler): emit shared-dispatcher form for oneOf-routed alts"
```

---

## Task 3: Wire `emitSharedDispatcher` into `emitDispatcher`

**Files:**
- Modify: `packages/compiler/src/emit/v2/dispatch.ts` (top of `emitDispatcher`)

- [ ] **Step 1: Read the current `emitDispatcher` to understand exactly where to inject**

```bash
sed -n '22,50p' packages/compiler/src/emit/v2/dispatch.ts
```

Confirm `emitDispatcher(info, schema, parseFnName)` is the entry, and that immediately after the early-return guards (single-production case, etc.) is where you want to insert the new branch.

- [ ] **Step 2: Modify `dispatch.ts` to try shared-dispatch first**

In `packages/compiler/src/emit/v2/dispatch.ts`, add an import at the top:

```typescript
import { detectSharedDispatch, emitSharedDispatcher } from './shared-dispatch.ts';
```

Inside `emitDispatcher`, immediately after the existing early-returns for the trivial cases (single-production, etc.) and BEFORE `tryEmitBytePrefix`, add:

```typescript
  const shared = detectSharedDispatch(info);
  if (shared !== null) {
    const altFnNames = info.productions.map((_p, idx) => `${parseFnName}__alt${idx}`);
    // The leading literal is the first span's text — detectSharedDispatch
    // already guaranteed every alt shares spans[0] and it's a literal.
    const leadingLiteral = info.productions[0]!.spans[0]!.text!;
    const body = emitSharedDispatcher(parseFnName, altFnNames, shared, leadingLiteral);
    return `function ${parseFnName}(state: State): unknown {\n${body}\n}`;
  }
```

(Adapt to the exact return shape of `emitDispatcher` — if it returns just the body, return just the body; if it returns the wrapped function, return the wrapped function. Match the existing pattern at the bottom of the function.)

- [ ] **Step 3: Regenerate all parsers**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run generate 2>&1 | tail -5
cd packages/markdown && npm run generate 2>&1 | tail -3 && cd ../yaml-block && npm run generate 2>&1 | tail -3 && cd ../cron && npm run generate 2>&1 | tail -3
cd /Users/valerii/Develop/parser3_codex
```

Expected: all five generate successfully (no thrown errors). The generated `packages/html/src/_generated/parser.ts` should now have a `parseHtmlElement` that contains a `switch (__dispatchTag) { case "script": ... }` instead of the current 17-alt serial probe.

- [ ] **Step 4: Smoke-check the new dispatcher**

```bash
sed -n '/function parseHtmlElement(state/,/^}/p' packages/html/src/_generated/parser.ts | head -80
```

Expected: you see `let __peekOff = off + 1`, ident-scan, `input.slice(__tagStart, __peekOff).toLowerCase()`, then `switch (__dispatchTag) { case "script": ... case "tr": ... }` etc.

- [ ] **Step 5: Commit the wiring + regenerated parsers**

```bash
git add packages/compiler/src/emit/v2/dispatch.ts packages/html/src/_generated/parser.ts
# any other regenerated parsers that actually drifted
git status --short
git diff --stat
git commit -m "feat(compiler): wire shared-dispatch into emitDispatcher

Routes oneOf-discriminated alts via switch on the captured tag instead
of probing 17 alts serially per HtmlElement. Alt bodies unchanged."
```

---

## Task 4: Update golden hash and verify the full test suite

**Files:**
- Modify: `packages/parser/test/generated-parser-ir.golden.json` (html row, plus any other rows whose generated parser drifted)

- [ ] **Step 1: Run the byte-stable hash gate to see which packages drifted**

```bash
cd /Users/valerii/Develop/parser3_codex
node --test --import tsx packages/parser/test/generated-parser-ir.test.ts 2>&1 | grep -A2 'not ok\|SHA256'
```

Expected: one or more `SHA256 mismatch` entries listing the actual hash for each drifted file.

- [ ] **Step 2: Compute fresh hashes and update the golden**

```bash
shasum -a 256 packages/css/src/_generated/parser.ts packages/html/src/_generated/parser.ts packages/markdown/src/_generated/parser.ts packages/cron/src/_generated/parser.ts packages/yaml-block/src/_generated/parser.ts
```

Update each drifted entry in `packages/parser/test/generated-parser-ir.golden.json` to the new hash. (Use `Edit`. Do not edit hashes for files that did NOT drift — verify with the shasum output above.)

- [ ] **Step 3: Run the full test suite**

```bash
cd /Users/valerii/Develop/parser3_codex
npm test 2>&1 | grep -E '^# (tests|pass|fail)'
```

Expected: every workspace's `fail` line is `0`. If any test fails, STOP — that's a correctness regression introduced by the new dispatcher and must be diagnosed (likely a shape `detectSharedDispatch` accepted that shouldn't have been; tighten detection).

- [ ] **Step 4: Commit the golden update**

```bash
git add packages/parser/test/generated-parser-ir.golden.json
git commit -m "test(parser): refresh golden hash for shared-dispatch codegen"
```

---

## Task 5: Measure the bench delta

**Files:**
- None modified.

- [ ] **Step 1: Run the html bench and record the new huge-page number**

```bash
cd /Users/valerii/Develop/parser3_codex/packages/html
yarn bench 2>&1 | grep -E 'huge-page|parser2 html parse fast|parse5 parse' | head -6
```

Compare against the pre-change baseline (huge-page parser2 fast ~42 ms, parse5 ~40 ms, ratio 0.91x).

Expected (Path 1): a meaningful drop on huge-page (target: from ~42 ms toward ~20 ms, putting parser2 ahead of parse5 again). Path 1 alone is unlikely to fully restore the 5x memory baseline — that needs Path 2 (factor the prologue out of alt bodies) or the other items in the shortlist (D/E/F). Record the actual number you see.

- [ ] **Step 2: Run the css bench too — css has fewer oneOf-discriminated relations but it's worth confirming no regression**

```bash
cd /Users/valerii/Develop/parser3_codex/packages/css
yarn bench 2>&1 | grep -E 'huge-page|parser2 css|postcss' | head -8
```

Expected: css numbers within noise of pre-change (no regression). If css is faster too, great.

- [ ] **Step 3: Report the numbers, do not commit anything in this task**

The bench output is the deliverable. No code or test changes here.

---

## Self-Review

**1. Spec coverage:**
- Optimization (A) from the shortlist: ✓ Tasks 1–3 implement detection and emission; Task 4 verifies correctness; Task 5 measures impact.
- The plan explicitly defers Path 2 (factoring the prologue out of alt bodies). That deferral is documented in the goal and non-goals.

**2. Placeholder scan:**
- No TBDs or `add error handling`. Every code block contains the actual content.
- Task 3 Step 2 says "Adapt to the exact return shape of `emitDispatcher`" — that's not a placeholder, it's an instruction to mirror an existing pattern the engineer will see in front of them. The code blocks before and after fully specify the change.

**3. Type consistency:**
- `SharedDispatch` fields used in Task 2's emit (`prefixLen`, `discriminatorIdx`, `tagToAlts`, `catchAllAlts`) match the type declared in Task 1.
- `detectSharedDispatch` signature `(info: NodeTypeInfo) → SharedDispatch | null` is consistent across Task 1 (declaration) and Task 3 (caller).
- `emitSharedDispatcher` signature `(parseFnName, altFnNames, dispatch, leadingLiteral) → string` is consistent between Task 2 (declaration) and Task 3 (caller).
