# Bidirectional Engine Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the schema → codegen engine to 10/10: any schema author writes only `schema.ts`; the compiler emits maximally-optimized straight-line code for every declared encoding (parse, ast, stringify, html, json, …); correctness is enforced mechanically at codegen time; adding a new schema (YAML, Pug, color, URL) requires zero engine changes.

**Architecture:** Build on the existing `InferredSchema` IR and v2 scannerless emit. Add the four missing engine pillars: (1) a reference interpreter for differential testing, (2) mechanical round-trip + coverage theorems at codegen time, (3) fusion that skips AST materialization when not needed, (4) a pluggable backend interface + bytecode backend. Add two missing schema primitives — indentation and Unicode policy — so YAML/Python/case-insensitive grammars stay in schema-only territory. The user-facing DSL (`ex(...)`) does **not** change; only the engine does.

**Tech Stack:** TypeScript 5.x (Node 20+), tsx for codegen, tinybench for perf gates, esbuild for size gates. No new runtime deps. Test framework: existing `node:test` style under `packages/<schema>/test/*.test.ts`.

---

## Pre-flight: scope and licenses

Updated from the user's final scoping clarifications:

1. **Target packages: css, html, markdown only.** The 9 other parser packages (`arn`, `cron`, `css-color`, `css-length-percentage`, `js`, `log`, `mac`, `proto`, `url`) are out of scope for this plan. They may remain in the repo as-is, broken under v2, or be deleted later — the user's call. Every "all 12 packages" reference below has been collapsed to "css, html, markdown."

2. **No backward-compatibility constraint.** The user explicitly waived back-compat. This unlocks:
   - Deleting v1 emit (`packages/compiler/src/emit/scannerless/`, `direct-fast.ts`) the moment the 3 target packages are green on v2 — no transition period.
   - Reshaping the DSL surface (`ex()` → `relation()`, type renames, IR shape changes) without migration concern for the 9 out-of-scope packages — those will break and that's fine.
   - Changing the generated parser file format / public API freely (`render`/`stringify`/`validate` signatures are not contracts).

3. **DSL clean break is BACK ON.** With the back-compat waiver, the user's original "Clean break (Recommended)" answer holds. Phase 9 is added at the end of the plan to rename/restructure the DSL surface (`ex()` → `relation()`, builder reshape). It's last because the engine work is the user's stated primary goal — the DSL rename is cosmetic on top.

4. **TS + bytecode backend** — kept as-is. Phase 6 implements the pluggable backend interface and the bytecode backend.

## Risks captured up front

- **Phase 1 (v2 completion) blocks everything.** Until css/html/markdown generate green under v2, optimizations layered on top would need parallel branches. Sequence Phase 1 first, no exceptions. Drastically simpler now: only 3 packages to migrate, with no back-compat constraint.
- **Phase 2 (reference interpreter) is the trust anchor.** Without it, Phases 3–6 land without a way to differential-test optimized output against ground truth. Do not skip.
- **Phase 5 (fusion) has the highest architectural uncertainty.** Skip-AST optimization may discover the `InferredSchema` IR lacks fields needed for direct source→target codegen. Plan to revisit after Phase 2 lands.
- **Phase 7 (indentation primitive) may force IR-shape change to spans.** If indentation is treated as a span modifier (`.indented({...})`), spans grow a new modifier kind; if treated as a separate IR node (`IndentScope`), `Production.spans` becomes a tree, not a list. Decide at the start of Phase 7.
- **Out-of-scope packages may rot.** The 9 ignored packages will likely break as the engine evolves. That's acceptable per user direction; do not spend effort keeping them green. A one-line note in their README ("not maintained — out of scope for engine overhaul as of 2026-05-26") is the only courtesy required.

## File map — what changes where

**Compiler additions (new files):**
- `packages/compiler/src/interp/index.ts` — reference interpreter entry
- `packages/compiler/src/interp/parse.ts` — interpret production IR on bytes
- `packages/compiler/src/interp/render.ts` — interpret render bodies
- `packages/compiler/src/interp/stringify.ts` — interpret inverse derivation
- `packages/compiler/src/check/round-trip.ts` — round-trip theorem
- `packages/compiler/src/check/coverage.ts` — inverse coverage theorem
- `packages/compiler/src/check/dispatch.ts` — first-byte conflict detector
- `packages/compiler/src/check/total.ts` — total-dispatch byte coverage
- `packages/compiler/src/emit/v2/scan-until-ac.ts` — Aho-Corasick codegen for multi-stop `.until()`
- `packages/compiler/src/emit/v2/dispatch-table.ts` — 256-entry first-byte dispatch
- `packages/compiler/src/emit/v2/fusion.ts` — direct source→target codegen pass
- `packages/compiler/src/emit/backend.ts` — backend interface
- `packages/compiler/src/emit/bytecode/index.ts` — bytecode backend entry
- `packages/compiler/src/emit/bytecode/ops.ts` — opcode set + encoder
- `packages/compiler/src/emit/bytecode/runtime.ts` — tiny interpreter shipped per package

**Compiler modifications:**
- `packages/compiler/src/index.ts` — wire interpreter, theorems, backend dispatch
- `packages/compiler/src/cli.ts` — `--backend ts|bytecode|interp`, `--check`, `--fuzz`
- `packages/compiler/src/model.ts` — extend with indentation IR + Unicode policy fields
- `packages/compiler/src/emit/v2/production.ts` — fusion-aware bodies
- `packages/compiler/src/emit/v2/runtime.ts` — add `scan-until-ac` runtime helper

**Parser DSL additions:**
- `packages/parser/src/types.ts` — add `IndentModifier`, `unicode`/`caseInsensitive`/`newlines`/`bom` policies
- `packages/parser/src/example.ts` — add `.indent(...)` modifier builder

**New tests:**
- `packages/compiler/test/interp.test.ts` — interpreter conformance
- `packages/compiler/test/round-trip.test.ts` — theorem enforcement
- `packages/compiler/test/dispatch-conflicts.test.ts` — first-byte conflict detection
- `packages/compiler/test/fuzz.test.ts` — differential fuzzer harness
- `packages/compiler/test/scan-until.test.ts` — AC codegen
- `packages/compiler/test/fusion.test.ts` — direct source→target paths
- `packages/compiler/test/bytecode.test.ts` — bytecode backend conformance
- `packages/compiler/test/indentation.test.ts` — indent primitive

**Documentation:**
- `docs/engine-roadmap.md` — this plan's living version
- `docs/reference-interpreter.md` — interp design + diff-fuzz contract
- `docs/codegen-theorems.md` — round-trip & coverage proofs
- `docs/bytecode-backend.md` — opcode set + perf envelope
- Updates to `docs/example-first-structure-dsl.md` for indent + Unicode primitives

---

## Phase 1 — Complete v2 emit for css, html, markdown; delete v1

**Goal:** `css`, `html`, and `markdown` packages all generate + pass tests + meet perf/size gates using the v2 backend. The v1 scannerless emit and `direct-fast.ts` are deleted in this phase. The other 9 parser packages are left alone (they may break — that's fine per user direction).

**Why first:** Every later optimization (fusion, AC scan-until, bytecode) layers on the v2 IR + codegen. Drastically simpler with only 3 packages to land and no back-compat overhead.

**Files:**
- Read: `docs/scannerless-emit-v2.md` (the v2 contract)
- Read: `packages/compiler/src/emit/v2/*.ts`
- Modify: `packages/css/package.json`, `packages/html/package.json`, `packages/markdown/package.json` — switch `generate` to `--v2`
- Run: `npm run generate -w @parser2/{css,html,markdown}`
- Run: `npm run test -w @parser2/{css,html,markdown}`
- Run: `npm run gate -w @parser2/{css,html,markdown}`
- Delete (in Task 1.4): `packages/compiler/src/emit/scannerless/`, `packages/compiler/src/emit/direct-fast.ts`

### Task 1.1: Read v2 design and capture status for the 3 target packages

- [ ] **Step 1**: Read `docs/scannerless-emit-v2.md` end-to-end. Note any "TODO" or "not yet" markers.
- [ ] **Step 2**: Read `packages/compiler/src/emit/v2/index.ts`, `dispatch.ts`, `production.ts`, `span.ts`, `runtime.ts` (all under 400 LOC each).
- [ ] **Step 3**: Run `npm run generate -w @parser2/css -- --v2`, `npm run generate -w @parser2/html -- --v2`, `npm run generate -w @parser2/markdown -- --v2`. Capture which succeed, which fail, and the failure mode.
- [ ] **Step 4**: Create `docs/v2-migration-status.md` with one line per target package: `- [ ] css — <one-line status>` etc.
- [ ] **Step 5**: Commit:

```bash
git add docs/v2-migration-status.md
git commit -m "docs: capture v2 status for css/html/markdown"
```

### Task 1.2: Migrate any of {css, html, markdown} that pass v2 cleanly

For each of the 3 target packages whose `npm run generate --v2` already succeeds and whose existing tests pass:

- [ ] **Step 1**: Edit `packages/<pkg>/package.json` — change the `"generate"` script to include `--v2`.
- [ ] **Step 2**: Run `npm run generate -w @parser2/<pkg>`.
- [ ] **Step 3**: Run `npm run test -w @parser2/<pkg>`. Expected: all green.
- [ ] **Step 4**: Run `npm run gate -w @parser2/<pkg>`. If perf regresses, do not relock the baseline; record as a Phase 4/5 follow-up.
- [ ] **Step 5**: Commit:

```bash
git add packages/<pkg>/package.json packages/<pkg>/src/_generated/parser.ts
git commit -m "chore(<pkg>): migrate to v2 emit"
```

### Task 1.3: Implement the missing v2 emit features (re-scoped 2026-05-26)

**Re-scope reason:** Task 1.1 recon revealed v2 was built only against `cron`. To emit css/html/markdown the v2 backend needs ≥5 features built. Each feature is its own TDD cycle, so the original single-bug Task 1.3 splits into 1.3a–1.3e. Order is dependency-driven: foundational primitives first, dispatcher refinements after, narrow refinements last.

**Shared workflow for each of 1.3a–1.3e:**

1. **Write the minimal failing test** in `packages/compiler/test/v2-regressions.test.ts` (create if absent) — synthesize the smallest schema example that triggers the feature.
2. **Run it, confirm it fails** with the expected `v2: <feature> not yet supported` error.
3. **Implement the feature** in the appropriate `packages/compiler/src/emit/v2/*.ts` file. Stay within the existing v2 design contract (`docs/scannerless-emit-v2.md`).
4. **Run the failing test, confirm pass.** Rerun the full compiler suite: `npm run test -w @parser2/compiler`.
5. **Re-run v2 codegen for the affected in-scope packages.** Where the feature now unblocks a package, update `docs/v2-migration-status.md` (move the package from `- [ ]` to `- [x]` and note what changed).
6. **Commit**:
   ```bash
   git add packages/compiler/src/emit/v2/ packages/compiler/test/v2-regressions.test.ts docs/v2-migration-status.md
   git commit -m "feat(v2): <one-line summary of the feature>"
   ```

#### Task 1.3a: `until` / `rawUntil` span emit

**File touched:** `packages/compiler/src/emit/v2/span.ts:60`
**Blocks:** css (immediately); html and markdown likely also touch this in their `.until(...)` captures.
**Acceptance:** v2 codegen no longer throws on `until`/`rawUntil`; produces straight-line scan code matching the contract in `docs/scannerless-emit-v2.md` (`scan-until(stop-set)` primitive — tight byte loop respecting strings/brackets/escapes; advances `off` to first un-nested stop). Run the v2-regression test added in Step 1 and the existing compiler suite — both green. Then attempt `npx tsx packages/compiler/src/cli.ts packages/css/src/schema.ts --v2`; ratchet to next failure (next feature).

#### Task 1.3b: Multi-role non-repeats span emit

**File touched:** `packages/compiler/src/emit/v2/span.ts:171`
**Blocks:** any production with a single recursive span listing >1 role (e.g. `['Comment', 'Rule']`).
**Acceptance:** v2 emits a `tryRoles`-style ladder for multi-role non-repeats spans — for each role, peek the first-byte signature, dispatch to its parser, fall through on mismatch. The emitted code must NOT use throw/try-catch for backtracking (per v2 design: "no exceptions"); use null returns. Tests green; codegen ratchet.

#### Task 1.3c: Multi-role repeats span emit

**File touched:** `packages/compiler/src/emit/v2/span.ts:216`
**Blocks:** html and markdown (Element body, Document body — both loop multi-role children).
**Acceptance:** v2 emits a repeated multi-role child loop. Each iteration: try each role's first-byte dispatch; if any matches, consume and append to the children array; if none match, exit the loop. Supports `sep` / `min` / `max` / `trailing` modifiers per the existing `repeats` modifier contract. Tests green; codegen ratchet — html and markdown should generate fully after 1.3a + 1.3c are done.

#### Task 1.3d: Discriminator peek-scan dispatcher (ladder rung 2)

**File touched:** `packages/compiler/src/emit/v2/dispatch.ts:5`
**Blocks:** css (Rule vs Declaration disambiguation; both can start with an identifier byte, so first-byte dispatch alone can't separate them — needs a bounded peek-scan for `:` before `;`/`{`).
**Acceptance:** dispatcher ladder gains rung 2: when two productions share a first-byte signature, emit a bounded peek-scan over a small set of discriminating bytes (capped at, say, 64 bytes of lookahead). The discriminator set is inferred from the differing structural patterns in the two productions. No backtracking via throw; either rung 2 conclusively picks a production or falls through to rung 3 (sentinel speculation). Tests green; css codegen succeeds.

#### Task 1.3e: `number` class refinements (`float`, `scientific`, others CSS needs)

**File touched:** `packages/compiler/src/emit/v2/span.ts:303` (and any other places where number scanning is emitted)
**Blocks:** css (which has `100%`, `1.5em`, etc — float-shaped numbers).
**Acceptance:** v2's number scanner honors refinements declared on number spans. At minimum: `float` (digits + optional `.` + optional fractional digits), `scientific` (float + optional `[eE][+-]?digits`), `separator` (allow `_` between digit runs). Tests green; css codegen + tests succeed end-to-end.

**Exit criteria for combined Task 1.3:** all three of css/html/markdown generate cleanly with `--v2`; their tests pass against the v2-generated parser; their perf/size gates run (regressions OK at this stage — recovered in Phase 4). `docs/v2-migration-status.md` shows all three checked.

### Task 1.4: Retire v1 scannerless emit + direct-fast

Only when **all three of css, html, markdown** are green under v2 with gates passing. The 9 out-of-scope packages will break; that is acceptable (drop a one-line note in their READMEs so future maintainers see it).

- [ ] **Step 0 (optional)**: For each of the 9 out-of-scope packages, append a single line to its README: `> Status: out of scope for v2 engine overhaul (2026-05-26). Will likely break on regeneration.`
- [ ] **Step 1**: Delete `packages/compiler/src/emit/scannerless/` (the directory).
- [ ] **Step 2**: Delete `packages/compiler/src/emit/direct-fast.ts`.
- [ ] **Step 3**: Edit `packages/compiler/src/index.ts` — remove the `emitScannerlessParser` import and the `if (!options.v2)` branch in `generateParser`. Drop the `v2` field from `GenerateOptions` (it's now the only path):

```ts
// before:
export type GenerateOptions = { readonly packageName?: string; readonly v2?: boolean };
export function generateParser(root, validation, options = {}) {
  const schema = inferSchema(root, validation, options);
  if (options.v2) return emitV2Parser(schema);
  return emitScannerlessParser(schema);
}

// after:
export type GenerateOptions = { readonly packageName?: string };
export function generateParser(root, validation, options = {}) {
  const schema = inferSchema(root, validation, options);
  return emitV2Parser(schema);
}
```

- [ ] **Step 4**: Edit `packages/compiler/src/cli.ts` — remove the `--v2` flag parsing and the `v2` variable; the generator always emits v2.
- [ ] **Step 5**: Run `npm run test --workspaces` and `npm run generate --workspaces`. Everything must stay green.
- [ ] **Step 6**: Commit:

```bash
git add packages/compiler/src/
git commit -m "refactor(compiler): retire v1 scannerless emit and direct-fast"
```

**Phase 1 exit gate:** css, html, markdown all generate + test + gate green under v2; v1 emit is deleted; no `--v2` flag remains; 9 out-of-scope packages may be broken (acceptable).

---

## Phase 2 — Reference interpreter + differential fuzzing harness

**Goal:** Ship a slow-but-obviously-correct interpreter that runs `InferredSchema` directly (no codegen). Build a differential fuzzer that feeds random + corpus inputs to both `interp` and the v2-generated parser and asserts identical output. This is the **trust anchor** every subsequent optimization depends on.

**Files:**
- Create: `packages/compiler/src/interp/index.ts`, `parse.ts`, `render.ts`, `stringify.ts`
- Create: `packages/compiler/test/interp.test.ts`, `fuzz.test.ts`, `fuzz-helpers.ts`
- Modify: `packages/compiler/src/index.ts` — export `interpretSchema`
- Modify: `packages/compiler/src/cli.ts` — `--interp` and `--fuzz` flags

### Task 2.1: Interpreter — parse path

- [ ] **Step 1: Write the failing test** — `packages/compiler/test/interp.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { inferSchema } from '../src/index.ts';
import { interpretParse } from '../src/interp/parse.ts';
import markdownSchema from '@parser2/markdown/src/schema.ts';

test('interp parses a heading identically to the generated parser', () => {
  const inferred = inferSchema(markdownSchema);
  const result = interpretParse(inferred, '# hello');
  assert.equal((result as any).type, 'heading');
  assert.equal((result as any).depth, 1);
  assert.equal((result as any).text, 'hello');
});
```

- [ ] **Step 2: Run test, verify failure** — `npm run test -w @parser2/compiler -- --grep "interp parses"`. Expected: "Cannot find module .../interp/parse.ts".
- [ ] **Step 3: Create `packages/compiler/src/interp/parse.ts`** with a recursive `interpretParse(inferred, input)` that:
  - Resolves the root node-type's production set.
  - For each span in the chosen production, dispatches on `span.class` and `span.modifiers`:
    - `literal` → assert `state.input.startsWith(text, state.pos)`, advance.
    - `ident` / `number` / `string` / `hex` / `comment` → walk a closed-form character predicate per class; capture the slice.
    - `until` modifier → walk bytes tracking bracket depth (if `balanced: true`); stop at any literal in `stops` at depth 0.
    - `repeats` modifier → loop child production until separator-or-stop.
    - Recursive role spans → pick the production whose first-byte signature matches; recurse.
  - Construct the result by walking `production.renders.get('ast').body` via a `walkBody(body, captures)` helper.
  - Attach `source: { start, end }` from `state.startOff`/`state.endOff` and `lineStarts`.
- [ ] **Step 4: Run test, verify pass.**
- [ ] **Step 5: Add a test per primitive** in `interp.test.ts`: one for ident, one for number, one for `.until(...)`, one for `.repeats({sep})`, one for multi-role dispatch, one for `recovers()`, one for raws mode.
- [ ] **Step 6**: Iterate until all pass. Each new primitive that requires new interpreter code = one commit.
- [ ] **Step 7**: Commit:

```bash
git add packages/compiler/src/interp/parse.ts packages/compiler/test/interp.test.ts
git commit -m "feat(compiler): reference interpreter for parse"
```

### Task 2.2: Interpreter — render path (target dispatch)

- [ ] **Step 1: Failing test** — given an AST produced by `interpretParse`, `interpretRender(inferred, ast, 'html')` returns the same HTML string as the v2-generated `render(input, {type:'html'})`:

```ts
test('interp render html matches generated parser', async () => {
  const inferred = inferSchema(markdownSchema);
  const input = '# hello';
  const fromInterp = interpretRender(inferred, interpretParse(inferred, input), 'html');
  const generated = await import('@parser2/markdown');
  const fromGen = generated.render(input, { type: 'html' });
  assert.equal(fromInterp, fromGen);
});
```

- [ ] **Step 2: Run, verify failure.**
- [ ] **Step 3**: Create `packages/compiler/src/interp/render.ts`:
  - `interpretRender(inferred, value, target)`: identify which production produced `value` by matching against each production's `inverseDerived` IR (which already exists from `infer/invert.ts`).
  - Once the production is known, walk `production.renders.get(target).body`, substituting `$.name` references with the value's captured fields.
  - For Template bodies, concat `parts[i] + captures[slots[i].ref] + parts[i+1]`.
- [ ] **Step 4: Run test, verify pass.** Add tests for `ast`, `source`, and every custom target declared by every in-scope schema (css/html/markdown).
- [ ] **Step 5**: Commit:

```bash
git add packages/compiler/src/interp/render.ts packages/compiler/test/interp.test.ts
git commit -m "feat(compiler): reference interpreter for render"
```

### Task 2.3: Interpreter — stringify path (inverse direction)

- [ ] **Step 1: Failing test** — property: `interpretStringify(inferred, interpretParse(inferred, input), 'source')` round-trips every example in every in-scope schema (css/html/markdown) (modulo whitespace policy):

```ts
test('interp stringify round-trips every example', () => {
  for (const { name, schema } of allSchemas()) {
    const inferred = inferSchema(schema);
    for (const example of schema.examples) {
      const ast = interpretParse(inferred, example.input);
      const back = interpretStringify(inferred, ast, 'source');
      const reparsed = interpretParse(inferred, back);
      assert.deepEqual(stripSource(reparsed), stripSource(ast), `${name}: did not round-trip ${example.input}`);
    }
  }
});
```

- [ ] **Step 2: Implement** `packages/compiler/src/interp/stringify.ts` mirroring `emit/inverse.ts` + `emit/rebuild.ts` but as interpretation, not codegen. Use the existing `InverseIR` shapes — `object`, `array`, `scalar`, `ref`, `template`.
- [ ] **Step 3: Tests + commit.**

```bash
git add packages/compiler/src/interp/stringify.ts packages/compiler/test/interp.test.ts
git commit -m "feat(compiler): reference interpreter for stringify"
```

### Task 2.4: Differential fuzzer harness

- [ ] **Step 1: Failing test** — `packages/compiler/test/fuzz.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { inferSchema } from '../src/index.ts';
import { interpretParse } from '../src/interp/parse.ts';
import { loadCorpus, stripSource, allSchemas, preview } from './fuzz-helpers.ts';

test('interp == generated parser across corpus', async () => {
  for (const { name, schema, generatedModule, corpus } of await allSchemas()) {
    for (const input of corpus) {
      const inferred = inferSchema(schema);
      const interpAst = interpretParse(inferred, input);
      const genAst = generatedModule.render(input, { type: 'ast' });
      assert.deepEqual(stripSource(interpAst), stripSource(genAst), `${name} diverged on: ${preview(input)}`);
    }
  }
});
```

- [ ] **Step 2**: Write `fuzz-helpers.ts` — `loadCorpus(glob)` reads test fixtures; `stripSource(ast)` walks the tree deleting `source` keys; `preview(s)` truncates long strings; `allSchemas()` returns `[{ name, schema, generatedModule, corpus }]` for each of css/html/markdown.
- [ ] **Step 3**: Run the test. Any divergence is **either** an interpreter bug **or** a generated-parser bug. Fix whichever side is wrong (interpreter is the spec; if the generator disagrees, generator is wrong); commit the fix; rerun.
- [ ] **Step 4**: Add property-based generators in `fuzz-helpers.ts`:
  - `randomBytes(n)` — uniformly random bytes (must not crash either side).
  - `mutateCorpus(input)` — truncate / insert junk / swap adjacent bytes / duplicate lines.
  - `grammarDriven(schema)` — pick random examples from the schema and concatenate/wrap them.
  Assert: neither side crashes; on inputs that successfully parse, ASTs match.
- [ ] **Step 5**: Wire the fuzzer into `npm run test -w @parser2/compiler` with a small fixed corpus (fast), and add a separate `npm run fuzz` script with a larger generated corpus (slow, manual).
- [ ] **Step 6**: Commit:

```bash
git add packages/compiler/test/fuzz.test.ts packages/compiler/test/fuzz-helpers.ts packages/compiler/package.json
git commit -m "feat(compiler): differential fuzzer (interp vs generated)"
```

**Phase 2 exit gate:** `npm run fuzz` runs ≥ 60s with zero divergence across the 3 target packages (css, html, markdown).

---

## Phase 3 — Mechanical theorems at codegen time

**Goal:** The compiler refuses to emit if any of these fail for any schema:
- **Round-trip closure**: `parseAst(stringify(parseAst(s), 'source')) ≡ parseAst(s)` for every example `s` in the schema.
- **Inverse coverage**: every AST shape reachable by `parse` can be uniquely rendered by `stringify('source')` (already partially enforced by `validateInverseDiscrimination` in `infer/invert.ts`).
- **Total dispatch**: at every position in every production, every input byte is consumed or produces a typed diagnostic — no silent backtracking.
- **First-byte conflict**: no two productions in the same recursive-role list share a first-byte signature without an explicit `priority` (or longest-match-by-punctuator).

These run on the `InferredSchema` *and* through the reference interpreter on examples; failure = `CompilerError`. Replaces every `ORDER NOTE` comment in existing schemas.

**Files:**
- Create: `packages/compiler/src/check/round-trip.ts`, `coverage.ts`, `dispatch.ts`, `total.ts`
- Modify: `packages/compiler/src/index.ts` — call checks after `deriveInverses`
- Modify: `packages/compiler/src/cli.ts` — `--check` flag (run checks only, no emit)

### Task 3.1: Round-trip closure check

- [ ] **Step 1: Failing test** — `packages/compiler/test/round-trip.test.ts`:

```ts
test('round-trip closure holds for every example in each of css/html/markdown', async () => {
  for (const { name, schema } of await allSchemas()) {
    const inferred = inferSchema(schema);
    for (const example of schema.examples) {
      const ast = interpretParse(inferred, example.input);
      const renderedSource = interpretStringify(inferred, ast, 'source');
      const reparsed = interpretParse(inferred, renderedSource);
      assert.deepEqual(stripSource(reparsed), stripSource(ast), `${name}: round-trip failed for ${example.input}`);
    }
  }
});
```

- [ ] **Step 2**: Run; expect some failures across the 12 schemas — those reveal real bugs (productions whose `'source'` template doesn't exactly invert their parse).
- [ ] **Step 3**: For each failure, fix the schema (correct the source template) OR fix the inverse derivation. Commit per fix:

```bash
git commit -m "fix(<pkg>): correct 'source' template round-trip for <production>"
```

- [ ] **Step 4**: Create `packages/compiler/src/check/round-trip.ts` exporting `checkRoundTrip(inferred)` that runs the same property on `schema.examples` and throws `CompilerError` on first failure with a clear diagnostic message including the offending input and the divergent ASTs.
- [ ] **Step 5**: Wire into `inferSchema` in `packages/compiler/src/index.ts` after `deriveInverses(nodeTypes)`. Order: composition → productions → roles → validate → render-targets → invert → **checkRoundTrip** → tokenizer.
- [ ] **Step 6**: Verify all packages still generate by `npm run generate --workspaces`. Commit:

```bash
git add packages/compiler/src/check/round-trip.ts packages/compiler/src/index.ts packages/compiler/test/round-trip.test.ts
git commit -m "feat(compiler): enforce round-trip closure at codegen"
```

### Task 3.2: Total dispatch check

- [ ] **Step 1: Failing test** — at every span in every production, the union of:
  - the next literal it expects, and
  - any class scanners that fire at this position, and
  - any `.until()` stops, and
  - any role-recursion entries (their first-byte signatures)
  must cover every byte 0x00–0xFF, **or** the production must declare a fallthrough via `unknownChars: 'tolerate'` explicitly.

- [ ] **Step 2**: Implement `packages/compiler/src/check/total.ts`. Build a 256-bit `Uint8Array(32)` coverage map per dispatch position; flag any uncovered byte that isn't excluded by `unknownChars: 'tolerate'`.
- [ ] **Step 3**: Wire into `inferSchema`; expect existing schemas to be mostly green (they implicitly rely on `.until()` covering anything). If anything trips, either fix the schema or relax the check to a warning behind a `strict: true` flag.
- [ ] **Step 4**: Commit:

```bash
git add packages/compiler/src/check/total.ts packages/compiler/src/index.ts
git commit -m "feat(compiler): enforce total dispatch at codegen"
```

### Task 3.3: First-byte dispatch conflict check

- [ ] **Step 1: Failing test** — for any node-type with multiple productions, build a `Map<firstByte, Production[]>`. If any byte maps to >1 production AND those productions are not separable by longest-match punctuator OR a peek-discriminator, throw `CompilerError`.
- [ ] **Step 2**: Implement `packages/compiler/src/check/dispatch.ts`. This codifies the `ORDER NOTE` comments in markdown's schema as a mechanical rule.
- [ ] **Step 3**: Wire in; fix any schema that fails. Commit:

```bash
git add packages/compiler/src/check/dispatch.ts packages/compiler/src/index.ts
git commit -m "feat(compiler): detect first-byte dispatch conflicts at codegen"
```

### Task 3.4: Remove now-redundant `ORDER NOTE` comments

- [ ] **Step 1**: `grep -rn 'ORDER NOTE' packages/` to find all instances.
- [ ] **Step 2**: With Phase 3.3 enforcing the constraint mechanically, those comments are no longer load-bearing. Replace each with a one-line reference to the check: `// (order enforced by checkFirstByteDispatch)`.
- [ ] **Step 3**: Commit:

```bash
git add packages/
git commit -m "docs: replace ORDER NOTE comments with checker references"
```

**Phase 3 exit gate:** every in-scope schema (css/html/markdown) passes all four theorems; the docs cross-reference the checks instead of relying on author discipline.

---

## Phase 4 — Multi-pattern scanner generator (Aho-Corasick)

**Goal:** `.until(stops)` with arity ≥ 3 compiles to an Aho-Corasick automaton baked into the generated code, not a per-byte string-compare chain. Same applies to first-byte dispatch over many literal punctuators.

**Files:**
- Create: `packages/compiler/src/emit/v2/scan-until-ac.ts`
- Create: `packages/compiler/src/emit/v2/dispatch-table.ts`
- Modify: `packages/compiler/src/emit/v2/span.ts` — choose AC emit when `stops.length ≥ threshold`
- Modify: `packages/compiler/src/emit/v2/dispatch.ts` — emit jump-table for ≥4-prod nodes
- Create: `packages/compiler/test/scan-until.test.ts`

### Task 4.1: AC scanner builder (pure library, no codegen yet)

- [ ] **Step 1: Failing test** — exercise the scanner as a pure library first:

```ts
import { buildAcScanner } from '../src/emit/v2/scan-until-ac.ts';

test('AC scanner finds first stop occurrence across complex stop sets', () => {
  const stops = ['\n\n', '\n#', '\n>', '\n- ', '\n+ ', '\n* ', '\n```', '\n|', '\n---', '\n***', '\n___', '\n===', '\n['];
  const scanner = buildAcScanner(stops);  // returns { scan: (input, off) => number }
  assert.equal(scanner.scan('hello world\n# heading', 0), 11);
  assert.equal(scanner.scan('no stops here at all', 0), -1);
  assert.equal(scanner.scan('text\n\nblank', 0), 4);
});
```

- [ ] **Step 2: Run, verify failure** (file doesn't exist yet).
- [ ] **Step 3: Implement `buildAcScanner(stops)`** in `packages/compiler/src/emit/v2/scan-until-ac.ts`. Three substeps:
  - Build the trie from stops.
  - Compute failure links (standard Aho-Corasick BFS).
  - Return `{ scan(input, off) }` — an interpreted scan that walks the automaton. (No codegen yet — we want the algorithm right before generating code.)
- [ ] **Step 4: Run test, verify pass.**

### Task 4.2: AC scanner codegen — emit JS state machine

- [ ] **Step 1: Failing test** — given the AC automaton from Task 4.1, `scanner.emitJs(inputVar, offVar)` returns a JS string that, when wrapped in a function body and called, produces identical results to `scanner.scan`. Validate by writing the emitted code into a tmp `.ts` file, importing it dynamically, and comparing per-input outputs to the library scanner:

```ts
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

test('AC scanner emitted code matches library scan', async () => {
  const stops = ['\n\n', '\n#', '\n>', '\n- ', '\n+ ', '\n* ', '\n```'];
  const scanner = buildAcScanner(stops);
  const js = `export function scan(input, off) { ${scanner.emitJs('input', 'off')}; return off; }\n`;
  const dir = mkdtempSync(join(tmpdir(), 'ac-'));
  const file = join(dir, 'scan.mjs');
  writeFileSync(file, js);
  const mod = await import(pathToFileURL(file).href);
  for (const sample of fixtures) {
    assert.equal(mod.scan(sample, 0), scanner.scan(sample, 0), `diverged on ${preview(sample)}`);
  }
});
```

(Note: import-from-tmp is the same technique the existing v2 emit tests use to verify generated code.)

- [ ] **Step 2**: Implement `emitJs(inputVar, offVar)` — emit a `switch` over current state, each case dispatching on `input.charCodeAt(offVar)`. Use precomputed transition tables (string-literal arrays embedded in the emitted code) for high-fanout states.
- [ ] **Step 3**: Run test, verify pass.
- [ ] **Step 4**: Commit:

```bash
git add packages/compiler/src/emit/v2/scan-until-ac.ts packages/compiler/test/scan-until.test.ts
git commit -m "feat(compiler): Aho-Corasick scanner builder + JS emitter"
```

### Task 4.3: Wire AC into `.until()` codegen

- [ ] **Step 1: Failing test** — generating markdown's `MarkdownParagraph` production produces a parser whose paragraph-stop scan calls into the AC-emitted code (smoke-test by grepping the generated source for the AC state-machine signature or a marker comment the emitter inserts).
- [ ] **Step 2**: In `packages/compiler/src/emit/v2/span.ts`, for `until` modifier: when `stops.length >= 3`, build an AC scanner and inline its emitted JS at the span's emit point. When `stops.length < 3`, keep the current per-stop compare chain — AC adds setup cost that's not worth it for small N.
- [ ] **Step 3**: Regenerate all parser packages. Run all tests. Run all perf gates. Expect speedup on markdown paragraph and any other multi-stop scan.
- [ ] **Step 4**: If perf gates improve, relock baselines per package: `npm run baseline -w @parser2/<pkg>`. If any package regresses, investigate before locking.
- [ ] **Step 5**: Commit:

```bash
git add packages/compiler/src/emit/v2/span.ts packages/<pkgs>/src/_generated/parser.ts packages/<pkgs>/bench/perf-baseline.json
git commit -m "feat(compiler): AC scan-until codegen for multi-stop .until()"
```

### Task 4.4: 256-entry dispatch jump table

- [ ] **Step 1: Failing test** — for a node-type with N productions (N>3), the emitted dispatcher uses a single `switch (input.charCodeAt(off))` over byte values, falling through to the matching production.
- [ ] **Step 2**: Implement `packages/compiler/src/emit/v2/dispatch-table.ts`. Use it from `emit/v2/dispatch.ts` when a node-type has ≥4 productions OR ≥4 first-byte entries.
- [ ] **Step 3**: Regenerate, test, gate, commit:

```bash
git add packages/compiler/src/emit/v2/ packages/<pkgs>/src/_generated/parser.ts
git commit -m "feat(compiler): 256-entry dispatch jump table for wide nodes"
```

**Phase 4 exit gate:** markdown's paragraph throughput improves measurably (≥ 30% expected); no other package regresses beyond tolerance; all baselines relocked where improved.

---

## Phase 5 — Fusion pass: skip AST when target ≠ ast

**Goal:** `render(input, {type:'html'})` for markdown should not allocate any `{ type: 'heading', depth: 1, text: 'x' }` intermediate. The compiler detects that the consumer wants `html` directly and emits a single source→html function with zero object allocation.

**Architectural sketch** (not yet step-level; requires Phases 1–4 to land first because the fusion design depends on the AC scanner emit shape and the dispatch-table layout):

- Add a `fusion` pass in `packages/compiler/src/emit/v2/fusion.ts` that, given a target T:
  - For each production, walks `renders.get(T).body`.
  - For Template bodies → emits string-concat code reading directly from span capture offsets (no AST object construction).
  - For Object bodies → emits a streaming stringifier that visits captures in the order they will appear in T's output.
- The Phase 3 round-trip theorem doubles as the correctness gate: fused-html output must equal `interpretStringify('html', interpretParse(input))` for every example.
- API: add `renderFused(input, {type:'html'})` exported from generated parsers. Once callers migrate, drop the allocating `render` for non-ast targets.

### Tasks 5.1–5.x — to be detailed after Phase 2 lands

The fusion design depends on:
- The exact `InverseIR` shape used by `infer/invert.ts` for object/array/template bodies (will be familiar after Phase 2 interp work touches it).
- Whether the reference interpreter exposes per-capture offsets cleanly (Phase 2 will determine this).
- Whether any schema mixes targets (e.g. an `'html'` body refers to a capture only computed inside the `'ast'` builder — unlikely but possible).

**Action:** at the start of Phase 5, re-open this plan and write Tasks 5.1–5.N at full step-level granularity using the state of Phases 1–4. Do not pre-plan Tasks 5.x at step-level now — the IR may have shifted.

**Phase 5 exit gate:** for at least 3 schemas (markdown, html, css), `render(input, {type:'html'})` shows no object allocation in `node --prof` traces; throughput improves measurably.

---

## Phase 6 — Pluggable backend interface + bytecode backend

**Goal:** Codify the backend interface so backends are interchangeable; ship TS (current) and bytecode (new) backends.

**Architectural sketch:**

- Create `packages/compiler/src/emit/backend.ts` with:

```ts
export interface Backend {
  readonly name: string;
  readonly fileExtension: string;
  emit(schema: InferredSchema): string;
}
```

- Refactor `emitV2Parser` into a `Backend` named `'ts'` registered with this interface.
- Create `packages/compiler/src/emit/bytecode/`:
  - `ops.ts` — opcode enum: `PEEK`, `CONSUME`, `SCAN_CLASS`, `SCAN_UNTIL_AC`, `PUSH_CAPTURE`, `BUILD_OBJECT`, `CALL_PRODUCTION`, `RETURN`, `JUMP_IF`, `DISPATCH_TABLE`.
  - `encoder.ts` — walks `InferredSchema`, emits a `Uint8Array` opcode stream + a string pool + a number pool.
  - `runtime.ts` — a ~30 KB interpreter shipped per package (eventually shared via npm package) that reads the opcode stream and executes.
- CLI: `--backend ts|bytecode` selects.
- The reference interpreter from Phase 2 serves as the **specification** the bytecode backend must match — both run on `InferredSchema` so they share semantics; bytecode is just a serialization plus a tight interpreter.

### Tasks 6.1–6.x — to be detailed after Phase 5 lands

Same rationale as Phase 5: backend design depends on whether fusion is per-production or whole-schema; opcode shape depends on what AC scanner state needs to persist.

**Phase 6 exit gate:** at least 1 schema (recommend `cron` — small, simple) generates equivalently under both backends; bytecode runtime + opcode stream total < 50 KB; bytecode throughput within 2× of TS backend.

---

## Phase 7 — Indentation primitive

**Goal:** Add `.indent(...)` as a schema-level span modifier (or as a new IR primitive — decide at phase start). Unlocks YAML, Python, Pug, indented Markdown lists. After this phase, adding a YAML schema requires only writing `packages/yaml/src/schema.ts`.

**Decision point at phase start:** modifier vs IR primitive. The modifier approach is less invasive (`SpanModifier` gains a `kind: 'indent'` variant); the IR primitive approach makes scopes explicit (`IndentScope` containing child spans).

**API sketch:**

```ts
ex(`
- a
  - nested
- b
`)
  .as('YamlList')
  .span('- ')
  .span('item', 'a').until('\n')
  .indent('children', ['YamlListItem']).repeats({ min: 0 })  // <-- new
  .render('ast', { type: 'list', items: [{ value: $.item, children: $.children }] })
  .build();
```

- Indent scope: track a stack of expected column offsets; entries pushed on indented blocks, popped on dedent.
- Runtime: `state.indentStack` (small fixed-size array, 8 deep usually).
- Codegen: emit per-span `requireIndent(col)` and `requireDedent()` calls.

**Phase 7 exit gate:** a real YAML-subset schema (or Pug) parses 50 lines of representative input correctly through the v2 backend, the reference interpreter, and the round-trip theorem.

---

## Phase 8 — Unicode policy & case-insensitive primitives

**Goal:** Schema-level dials for Unicode normalization, case sensitivity, BOM, newline policy. Adding these unlocks HTML (case-insensitive tag names), email/URL grammars (Unicode-normalized), and Windows-friendly newline parsing — without engine changes.

**Schema additions:**

```ts
defineSchema({
  rootType: 'HtmlDoc',
  unicode: 'NFC',              // or 'NFD' | 'none'
  newlines: 'either-preserve', // or 'LF' | 'CRLF'
  caseSensitive: false,
  bom: 'allow',                // or 'reject' | 'require'
  examples: [...],
})
```

**Codegen impact:** small per-pass tweaks (normalize input before scan; lowercased compare table for literals when `caseSensitive: false`). All baked at codegen, zero runtime overhead.

**Phase 8 exit gate:** HTML schema can parse `<DIV>` and `<div>` equivalently with `caseSensitive: false` set; Unicode normalization round-trips for an email-grammar example.

---

## Phase 9 — DSL clean break: `ex()` → `relation()`

**Goal:** Rename and reshape the user-facing DSL to better match the bidirectional-relation framing. Now permitted by the back-compat waiver.

**Why last:** The engine work (Phases 1–8) is the user's stated primary goal. The DSL rename is cosmetic on top — useful for clarity, not for correctness or performance. Landing it last means the engine is already proven before we churn the schema files.

**Architectural sketch:**

- Rename `ex()` → `relation()` in `packages/parser/src/example.ts`.
- Reshape the builder so encodings are co-equal slots, not chained `.render(target, body)` calls:

```ts
// Before:
ex('# Release notes')
  .as('MarkdownLeaf')
  .span('#').span('text', 'Release notes').until('\n')
  .render('ast', { type: 'heading', depth: 1, text: $.text })
  .render('html', tpl`<h1>${$.text}</h1>`)
  .render('source', tpl`# ${$.text}`)
  .build();

// After:
relation('MarkdownLeaf', {
  shape: { text: string },
  encodings: {
    md:   parse('#').span('text', 'Release notes').until('\n'),
    html: tpl`<h1>${$.text}</h1>`,
    ast:  { type: 'heading', depth: 1, text: $.text },
  },
});
```

- Rewrite the 3 in-scope schemas (`packages/{css,html,markdown}/src/schema.ts`) onto the new DSL. The 9 out-of-scope packages stay broken on the old DSL (delete them entirely if convenient).
- Delete the old `ex()` builder.

### Tasks 9.1–9.x — to be detailed after Phase 8 lands

The new builder's exact shape depends on what we've learned from Phases 1–8. In particular, fusion (Phase 5) and indentation (Phase 7) will reshape what an "encoding" means in the IR; the DSL should follow.

**Phase 9 exit gate:** css, html, markdown schemas converted to `relation()` form; all tests green; all gates green; `ex()` and its types deleted from `packages/parser/src/`.

---

## Self-review

1. **Spec coverage:**
   - "Schema is source of truth" → Phase 1 (single backend on `InferredSchema`); Phase 3 (mechanical theorems).
   - "Max optimized codegen" → Phase 1 (v2 baseline); Phase 4 (AC + dispatch table); Phase 5 (fusion).
   - "Adding new schema = no engine tweak" → Phase 2 (interpreter verifies any schema runs); Phase 7 (indentation primitive); Phase 8 (Unicode/case policy).
   - "Any pair of encodings" → already supported by `.render(target, body)` and `infer/invert.ts`; reinforced by Phase 5 fusion.

2. **Placeholder scan:** Phases 5, 6, 7 use "architectural sketch" rather than step-level tasks. This is **intentional and called out** — premature step-level planning of those phases would force IR-shape decisions before Phases 1–4 resolve them. Phases 1–4 are at full step-level granularity. The plan tells the executor to re-open this file and add Tasks 5.x / 6.x / 7.x at the start of each phase.

3. **Type consistency:** `InferredSchema`, `Production`, `RenderTargetIR`, `InverseIR`, `CompilerError` are referenced consistently with their definitions in `packages/compiler/src/model.ts`. New types introduced (e.g. `Backend`, `IndentModifier`) are defined inside the file map and at the first task that creates them.

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration. Strongly recommended given the plan spans the compiler.

2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

**Important deferred decisions** (not for execution, for discussion):
- Confirm v2 emit is the right starting point — or decide that v2 needs more design work before Phase 1 begins.
- Decide whether to delete the 9 out-of-scope packages now, leave them broken, or revisit later (default: leave + README note).
- Phases 5, 6, 7, 9 each require a re-plan session when the previous phase's exit gate is met.

**Which approach?**
