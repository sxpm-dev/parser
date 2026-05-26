# Phase 5 — Fusion pass: skip AST materialization when target ≠ ast

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** For non-ast render targets, emit fused source→target functions that parse and render in one pass, eliminating the intermediate captures-object allocation. Markdown's `render(md, {type:'html'})` is the canonical case; css/html's `'source'` targets also fuse.

**Architecture:** Add a new codegen pass `emit/v2/fusion.ts` that, given a target T, emits per-production `__fusedRender_<NodeType>_<prodIdx>_<T>(state, into)` functions. These walk the production's spans like the parser, but instead of populating a captures object, they directly append to a string buffer (`into`) according to the target's RenderBody. The public `render(input, {type:T})` is rewired to use the fused path when available, falling back to the captures-based path for `'ast'`.

The Phase 3 round-trip theorem (`check/round-trip.ts`) doubles as correctness gate: fused output must equal canonical `interp.stringify(target, interp.parse(input))`. Phase 5 adds a new check that compares the v2-emitted fused render to that canonical output for every schema example.

**Tech Stack:** TypeScript 5.x (Node 20+), tsx for codegen, `node:test` for regressions.

---

## Pre-flight: working directory + baseline

Working directory: `/Users/valerii/Develop/parser3_codex/.claude/worktrees/engine+v2-and-theorems`.

Baseline after Phase 1.5 closeout (verify before starting):

```bash
npm run test -w @parser2/parser 2>&1   | grep -E "^# (tests|pass|fail)"
npm run test -w @parser2/compiler 2>&1 | grep -E "^# (tests|pass|fail)"
npm run test -w @parser2/css 2>&1      | grep -E "^# (tests|pass|fail|skipped)"
npm run test -w @parser2/html 2>&1     | grep -E "^# (tests|pass|fail)"
npm run test -w @parser2/markdown 2>&1 | grep -E "^# (tests|pass|fail)"
```

Expected: parser 25/25, compiler 304/304, css 56/57 (1 skip), html 30/30, markdown 76/76.

---

## Scope decisions

1. **Targets in scope:** css `source`, html `source`, markdown `source` AND `html`. The `ast` target keeps using the captures-based path (the AST IS the captures object, by design — no fusion to do).
2. **Body shapes in scope:** Template bodies (`tpl\`...\``) — simplest case, most aggressive win. Object/Array bodies for non-ast targets are out of scope for Phase 5; they'll fall back to the captures-based path (verified at codegen with a compile-time check).
3. **No back-compat constraint:** the public `render()` signature is unchanged; the change is purely internal. The old `__renderDispatch[T]` path stays as a fallback.
4. **Exit gate:** for the three in-scope schemas, `render(input, {type: T})` for T ∈ {source for css/html, html+source for markdown} is provably allocation-free for template bodies (verified by code inspection — no `{...}` or `[...]` literals in the emitted body) AND passes the new round-trip theorem AND every existing test stays green.

---

## File-touch map

**Compiler additions:**
- Create: `packages/compiler/src/emit/v2/fusion.ts` — per-(prod, target) fused emitter
- Create: `packages/compiler/test/fusion.test.ts` — codegen-shape regressions
- Modify: `packages/compiler/src/emit/render.ts` — the `render()` entry point chooses fused path when available
- Modify: `packages/compiler/src/index.ts` — add a Phase 5 check ensuring fused output matches canonical
- Modify: `packages/compiler/src/check/round-trip.ts` — extend theorem to compare fused vs canonical
- Modify: `packages/compiler/src/emit/v2/index.ts` — wire fusion emitter into the main pipeline

**Schemas (no changes expected):** css/html/markdown schemas keep their existing `.render(target, ...)` calls. Fusion is a codegen optimization, not a DSL change.

---

## Task 5.1: Fuse leaf-production template bodies (markdown Heading, simplest case)

**Why first:** Heading-level-1 has a 2-span production (`# ` literal + text capture) and a 3-target render (ast/html/source). The `html` target is `tpl\`<h1>${$.text}</h1>\`` — a pure template with one slot. Fusing this is the smallest possible fusion exercise.

**Files:**
- Create: `packages/compiler/src/emit/v2/fusion.ts`
- Test: `packages/compiler/test/fusion.test.ts`

- [ ] **Step 1: Failing codegen test.** Create `packages/compiler/test/fusion.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { generateParser } from '../src/index.ts';
import { readFileSync } from 'node:fs';

test('fusion: markdown Heading html target emits a fused render function', async () => {
  const { defineSchema } = await import('@parser2/parser');
  // Use the actual markdown schema so we exercise the real production shapes.
  const schema = (await import('../../markdown/src/schema.ts')).default;
  const src = generateParser(schema, undefined, { packageName: 'markdown' });
  // The fused html-target builder for HeadingOne must exist and must not
  // construct an intermediate captures object inside its body.
  assert.match(src, /function __fusedRender_HeadingOne_0_html/);
  // The body should write the string directly to an out buffer; no `{`
  // followed by `type:` (the marker of an AST object literal).
  const fnMatch = src.match(/function __fusedRender_HeadingOne_0_html[\s\S]*?\n}/);
  assert.ok(fnMatch);
  const body = fnMatch![0];
  assert.ok(!body.includes(`type:`), 'fused html body must not allocate AST objects');
});
```

- [ ] **Step 2: Run, expect failure.**

```bash
npx tsx --test packages/compiler/test/fusion.test.ts 2>&1 | grep "not ok"
```

- [ ] **Step 3: Create `fusion.ts` with a minimal emitter.** The emitter is given `(schema, nodeType, prodIdx, target)` and returns the source of `__fusedRender_<NodeType>_<prodIdx>_<target>(state, out): boolean`. Strategy:

   - Look up `production.renders.get(target)?.body`. If absent → skip (no fused builder for this combination).
   - If body kind is Template:
     - Walk the production's spans inline (re-use the same scan-emit logic from `emit/v2/span.ts`).
     - For each span, instead of binding to a captures object, hold the captured string in a local variable.
     - After all spans parse successfully, emit `out.push(segment0, captureVar0, segment1, captureVar1, …)` (or equivalent string concat) and return true.
     - On any span failure, return false (state rewound by the span emit code).
   - If body kind is not Template → return null from the emitter (the caller treats this as "no fused path; fall back").

Concretely:

```ts
// packages/compiler/src/emit/v2/fusion.ts
import type { InferredSchema, NodeTypeInfo, Production } from '../../model.ts';
import { jsString } from '../strings.ts';
import { emitSpan, type SpanBindings, type SpanContext } from './span.ts';

export function emitFusedRender(
  schema: InferredSchema,
  info: NodeTypeInfo,
  production: Production,
  prodIdx: number,
  target: string,
): string | null {
  const ir = production.renders.get(target);
  if (!ir) return null;
  const body = ir.body;
  // Only fuse template bodies for now.
  if (!isTemplate(body)) return null;
  // Build a fused function body: same span loop as the regular production
  // emit, but the final return appends to `out` instead of returning a
  // captures object.
  // … (see plan body for the structural template; the implementer fills in
  //   the per-span emit by reusing emit/v2/span.ts utilities)
  const fnName = `__fusedRender_${info.name}_${prodIdx}_${target}`;
  return `function ${fnName}(state: State, out: string[]): boolean {
  // <emit each span like emit/v2/production.ts does, capturing into named locals>
  // <on success, emit `out.push(${jsString(segment0)}, captureLocal0, ${jsString(segment1)}, …)`>
  // <return true>
}`;
}

function isTemplate(body: unknown): boolean {
  // Template render bodies carry `parts` + `slots` arrays in the IR.
  return typeof body === 'object' && body !== null
    && 'parts' in body && 'slots' in body;
}
```

The full implementer prompt should provide the exact template-shape predicate by reading the body type from `packages/parser/src/types.ts` (look for the structure produced by the `tpl\`…\`` tagged template literal).

- [ ] **Step 4: Wire `emitFusedRender` into the main pipeline.** In `packages/compiler/src/emit/v2/index.ts`, after the per-production parse functions are emitted, iterate every (production, target) pair. For each, call `emitFusedRender`. If it returns a string, append to the output. Build a `__fusedRenderDispatch[target]` map keyed by `__production` discriminator → fused function.

- [ ] **Step 5: Regenerate markdown and verify the fused function exists.**

```bash
npm run generate -w @parser2/markdown 2>&1 | tail -3
grep -n "__fusedRender_HeadingOne_0_html" packages/markdown/src/_generated/parser.ts
```

Expected: one matching line. The function body must NOT contain a `{` followed by `type:` (no AST object construction).

- [ ] **Step 6: Run all suites.** Existing tests must stay green; no new failures.

```bash
npm run test -w @parser2/compiler 2>&1 | grep -E "^# (tests|pass|fail)"
npm run test -w @parser2/markdown 2>&1 | grep -E "^# (tests|pass|fail)"
```

Expected: compiler 305/305 (+1 for the fusion test), markdown 76/76 (unchanged — fused path not yet wired into the public render).

- [ ] **Step 7: Commit.**

```bash
git add packages/compiler/src/emit/v2/fusion.ts packages/compiler/src/emit/v2/index.ts packages/compiler/test/fusion.test.ts packages/markdown/src/_generated/parser.ts packages/css/src/_generated/parser.ts packages/html/src/_generated/parser.ts
git commit -m "feat(v2): fused template-body render emitter (Task 5.1)"
```

---

## Task 5.2: Wire fused path into public `render()` and add round-trip check

**Why:** Task 5.1 emits the fused function but nobody calls it. This task makes `render(input, {type:'html'})` use the fused path when available.

**Files:**
- Modify: `packages/compiler/src/emit/render.ts` — entry-point `render()` function
- Modify: `packages/compiler/src/check/round-trip.ts` — extend theorem to fused output
- Test: `packages/compiler/test/fusion.test.ts` — add runtime regression

- [ ] **Step 1: Failing runtime test.** Append to `fusion.test.ts`:

```ts
test('fusion: markdown render(input, {type:html}) produces correct html via fused path', async () => {
  const { render } = await import('../../markdown/src/index.ts');
  assert.equal(render('# Hello\n', { type: 'html' }), '<h1>Hello</h1>');
});
```

- [ ] **Step 2: Run, observe current behavior.** It may already pass via the captures-based fallback. If so, the test by itself isn't enough — add an inspection that the fused path was used. Simplest: read `packages/markdown/src/_generated/parser.ts` and confirm the `render()` body calls `__fusedRenderDispatch` before falling back to captures.

- [ ] **Step 3: Rewrite the public `render()` emit in `packages/compiler/src/emit/render.ts:346-357`** to try the fused path first:

```ts
return `export function render(input: string, options?: { type?: string; mode?: ParseMode }): unknown {
  const target = options?.type ?? __defaultTarget;
  if (!target) {
    throw new Error("render: missing target; pass options.type or set defaultTarget on the schema");
  }
  // Fused path: when a target T has fused builders for every reachable
  // production from the root, parse-and-render in one pass with zero AST
  // allocation. Falls back to the captures-based path when any production
  // lacks a fused builder for T.
  if (target !== 'ast') {
    const fused = __renderFused(input, target);
    if (fused !== null) return fused;
  }
  const fn = __renderDispatch[target];
  if (!fn) {
    throw new Error("render: unknown target '" + target + "'");
  }
  const captures = options && options.mode ? __parse(input, { mode: options.mode }) : __parse(input);
  return fn(captures);
}`;
```

Where `__renderFused(input, target)` is a new function emitted by the fusion pipeline that:
1. Initializes a `State` and an `out: string[]`.
2. Calls the root production's fused builder for `target`.
3. Returns `out.join('')` on success, `null` on failure (which signals fallback).

- [ ] **Step 4: Extend the round-trip theorem.** In `packages/compiler/src/check/round-trip.ts`, for every (production, target, example) where target ≠ 'ast' AND a fused builder exists, run:

```ts
const fusedOutput = renderFusedDirect(production, target, example.input);
const canonicalOutput = interpStringify(target, interpParse(example.input));
if (fusedOutput !== canonicalOutput) {
  throw new CompilerError(`Phase 5 fusion mismatch for ${production.nodeType}#${prodIdx} target ${target}`);
}
```

This is the correctness gate.

- [ ] **Step 5: Re-generate + run all suites.**

```bash
npm run generate -w @parser2/css -w @parser2/html -w @parser2/markdown 2>&1 | tail -3
npm run test -w @parser2/compiler 2>&1 | grep -E "^# (tests|pass|fail)"
npm run test -w @parser2/css 2>&1 | grep -E "^# (tests|pass|fail|skipped)"
npm run test -w @parser2/html 2>&1 | grep -E "^# (tests|pass|fail)"
npm run test -w @parser2/markdown 2>&1 | grep -E "^# (tests|pass|fail)"
```

Expected: all suites pass; the new fusion runtime test passes; the round-trip theorem catches any mismatch at codegen.

- [ ] **Step 6: Commit.**

```bash
git add packages/compiler/src/emit/render.ts packages/compiler/src/emit/v2/fusion.ts packages/compiler/src/check/round-trip.ts packages/compiler/test/fusion.test.ts packages/{css,html,markdown}/src/_generated/parser.ts
git commit -m "feat(v2): wire fused path into render() + round-trip theorem (Task 5.2)"
```

---

## Task 5.3: Extend fusion to recursive children (markdown Document)

**Why:** Document's html target is `tpl\`${$.children}\`` where `$.children` is a recursive list of child nodes. To fuse this we need the fused builder to recursively call each child's fused builder for the same target.

**Files:**
- Modify: `packages/compiler/src/emit/v2/fusion.ts` — handle recursive role spans
- Test: `packages/compiler/test/fusion.test.ts`

- [ ] **Step 1: Failing runtime test.**

```ts
test('fusion: markdown Document renders complete document html', async () => {
  const { render } = await import('../../markdown/src/index.ts');
  const md = '# Heading\n\nParagraph text.\n';
  const html = render(md, { type: 'html' }) as string;
  assert.match(html, /<h1>Heading<\/h1>/);
  assert.match(html, /<p>Paragraph text\.<\/p>/);
});
```

- [ ] **Step 2: Extend `emitFusedRender` in `fusion.ts` to handle spans with `recursiveRoles`.** When a span captures recursive children, the fused builder dispatches to each role's fused builder via a small dispatch ladder mirroring the parse-time dispatcher.

- [ ] **Step 3: Regenerate markdown + run suites.** Expected: markdown test passes; no regressions.

- [ ] **Step 4: Commit.**

```bash
git add packages/compiler/src/emit/v2/fusion.ts packages/compiler/test/fusion.test.ts packages/markdown/src/_generated/parser.ts
git commit -m "feat(v2): fused render handles recursive children (Task 5.3)"
```

---

## Task 5.4: Verify fusion correctness across css/html/markdown via round-trip fixtures

**Why:** Tasks 5.1–5.3 establish the fusion mechanism. This task widens correctness coverage: run the existing per-package round-trip fixtures against the fused path explicitly.

**Files:**
- Modify: each package's `test/round-trip.test.ts` (if present) — add a `mode: 'fused'` variant
- OR: create `packages/compiler/test/fusion-round-trip.test.ts` that iterates all schemas + every (example × target ≠ ast)

- [ ] **Step 1: Locate existing round-trip tests.**

```bash
find packages/ -name "round-trip.test.ts" -not -path "*/node_modules/*"
```

- [ ] **Step 2: Write a comprehensive fusion round-trip test.** For each schema example, parse + render via captures path AND via fused path; assert outputs match.

- [ ] **Step 3: Run + fix any divergences surfaced.** Each divergence is a real Task-5 bug.

- [ ] **Step 4: Commit.**

```bash
git add packages/compiler/test/fusion-round-trip.test.ts
git commit -m "test(v2): fusion round-trip coverage across all schemas (Task 5.4)"
```

---

## Task 5.5: Documentation + close out Phase 5

- [ ] **Step 1: Update `docs/v2-migration-status.md`** with the new fused-path status.
- [ ] **Step 2: Update the master plan `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md`** marking Phase 5 tasks 5.1–5.5 complete with their commit SHAs.
- [ ] **Step 3: Commit.**

```bash
git add docs/v2-migration-status.md docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md
git commit -m "docs: Phase 5 fusion closeout"
```

---

## Exit gate (verified before declaring Phase 5 complete)

1. All 5 package suites pass (parser, compiler, css, html, markdown).
2. For markdown `render(md, {type:'html'})`: the fused path is exercised (verified by code-grep showing `__renderFused` reached from the public `render()` entry).
3. The fused template-body bodies in markdown contain no `{` followed by `type:` (no AST allocation in the hot path).
4. The Phase 3 round-trip theorem (now extended in Task 5.2) catches any fused-vs-canonical mismatch at codegen.

## Known follow-ups (deferrable to later phases)

- Object/array render bodies for non-ast targets still use the captures-based fallback. Phase 5 only fuses template bodies.
- Performance numbers (throughput, allocation profile) are not asserted programmatically. The exit gate uses code inspection. A future task could add `node --prof` benchmark gates.
- The fused dispatch ladder mirrors the parse-time dispatcher rather than sharing code. If the parse-time dispatcher changes (e.g. Task 4 switch tables get further optimized), the fused builders must be kept in sync. This is a maintainability concern, not a correctness one.
