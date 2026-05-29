# Bytecode Preamble Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make bytecode-emitted parsers honor the four input-normalization dials (`bom`, `unicode`, `newlines`, `caseSensitive`) by injecting the existing `emitPreamble()` code string into the bytecode `__parse` wrapper — closes Phase 8 follow-up #1.

**Architecture:** Approach A (inline preamble in the wrapper). Export `emitPreamble(schema)` from `packages/compiler/src/emit/v2/index.ts` and call it from `emitGeneratedFile` in `packages/compiler/src/emit/bytecode/index.ts`, injecting the returned code string between the `mode` check and `const state = {…}` in `__parse`. This mirrors the v2 backend's `emitPublicApi` pattern exactly and guarantees byte-for-byte semantic parity. The bytecode encoder, JSON serialization, opcode stream, decoder, and `runtime.ts` are **untouched** — dials are consumed at emit time, not encoded into the bytecode payload.

**Tech Stack:** TypeScript, Node's built-in `test`/`assert` module, tsx-based imports of the in-tree compiler.

**Out of scope (defer to follow-ups):**
- Phase 8 #3 (case-insensitive folding lowercases entire input including tag values) — keep the existing TS-emit behavior; do not "fix" it as part of this work.
- Phase 8 #6 (per-pattern case-insensitive escape hatch) — orthogonal.
- Phase 6 bytecode backlog items (#1, #2, #3, #7, #8, #10) — gated on other features, not this one.
- The user's in-flight `packages/cron/src/index.ts` + `packages/cron/bench/parse.ts` WIP — leave untouched; cron's 3 failing tests remain (they're independent of preamble work and were the baseline before this plan).

---

## File Structure

**Files modified:**
- `packages/compiler/src/emit/v2/index.ts` — change `emitPreamble` from `function` to `export function` (one-keyword change, no body changes).
- `packages/compiler/src/emit/bytecode/index.ts` — import `emitPreamble`, inject its result into the `__parse` wrapper template inside `emitGeneratedFile`.
- `packages/cron/src/_generated/parser.bcode.ts` — regenerated artifact; expected delta is one new line (`if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);`) inside `__parse`, because cron uses default `bom: 'allow'`.
- `docs/v2-migration-status.md` — mark Phase 8 follow-up #1 resolved with commit SHA.

**Files created:**
- `packages/compiler/test/bytecode-preamble.test.ts` — new test file covering preamble emission + end-to-end dial application via the bytecode path.

**Files explicitly NOT touched:**
- `packages/compiler/src/emit/bytecode/encoder.ts` — `EncodedSchema` stays dial-free.
- `packages/compiler/src/emit/bytecode/runtime.ts` — `runParse` stays dial-agnostic.
- `packages/cron/src/schema.ts` — cron schema dial declarations are unchanged.
- `packages/cron/src/index.ts`, `packages/cron/bench/parse.ts` — user WIP, leave as-is.

---

## Task 1: Export `emitPreamble` from the v2 emit module

**Files:**
- Modify: `packages/compiler/src/emit/v2/index.ts:253`

- [ ] **Step 1: Make `emitPreamble` exported**

Change line 253 from:

```ts
function emitPreamble(schema: InferredSchema): string {
```

to:

```ts
export function emitPreamble(schema: InferredSchema): string {
```

Body and signature are otherwise unchanged. The function is already pure (returns a code string given an `InferredSchema`); no other call sites in the v2 backend need updating because `emitPublicApi` (the only existing caller) imports it from the same file.

- [ ] **Step 2: Verify v2 backend still compiles + tests pass**

```bash
npm run test -w "@parser2/compiler" 2>&1 | grep -E "^# (tests|pass|fail|skipped)"
```

Expected: `# tests 378 # pass 378 # fail 0 # skipped 0`

- [ ] **Step 3: Commit**

```bash
git add packages/compiler/src/emit/v2/index.ts
git commit -m "$(cat <<'EOF'
refactor(compiler): export emitPreamble for cross-backend reuse

Prep for bytecode backend to apply the same input-normalization
preamble the v2 (TS) backend already applies — closes Phase 8
follow-up #1.
EOF
)"
```

---

## Task 2: TDD — Test that bytecode emit injects the same preamble string

**Files:**
- Create: `packages/compiler/test/bytecode-preamble.test.ts`

This task writes the failing test that locks in the contract: for any schema, the bytecode wrapper's `__parse` body must contain the exact preamble code string the v2 backend produces.

- [ ] **Step 1: Write the failing test file**

```ts
// packages/compiler/test/bytecode-preamble.test.ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inferSchema } from '../src/index.ts';
import { BYTECODE_BACKEND } from '../src/emit/bytecode/index.ts';
import { emitPreamble } from '../src/emit/v2/index.ts';
import type { InferredSchema } from '../src/model.ts';

// Helper: clone an InferredSchema with dial overrides.
function withDials(
  schema: InferredSchema,
  dials: Partial<Pick<InferredSchema, 'bom' | 'unicode' | 'newlines' | 'caseSensitive'>>,
): InferredSchema {
  return { ...schema, ...dials };
}

test('bytecode emit: __parse contains the same preamble code string as v2 emit (default dials → BOM allow block)', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = inferSchema(raw);
  const expectedPreamble = emitPreamble(schema);
  // Sanity: default cron dials produce the BOM allow block.
  assert.ok(expectedPreamble.includes('charCodeAt(0) === 0xfeff'));
  const source = BYTECODE_BACKEND.emit(schema);
  assert.ok(
    source.includes(expectedPreamble),
    'bytecode wrapper must contain the v2 preamble code verbatim',
  );
});

test('bytecode emit: caseSensitive:false produces toLowerCase preamble line', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = withDials(inferSchema(raw), { caseSensitive: false });
  const expectedPreamble = emitPreamble(schema);
  assert.ok(expectedPreamble.includes("input = input.toLowerCase();"));
  const source = BYTECODE_BACKEND.emit(schema);
  assert.ok(source.includes("input = input.toLowerCase();"));
});

test('bytecode emit: newlines:CRLF produces \\r\\n replacement preamble line', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = withDials(inferSchema(raw), { newlines: 'CRLF' });
  const source = BYTECODE_BACKEND.emit(schema);
  assert.ok(source.includes("input = input.replace(/\\r\\n/g, '\\n');"));
});

test('bytecode emit: unicode:NFC produces normalize preamble line', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = withDials(inferSchema(raw), { unicode: 'NFC' });
  const source = BYTECODE_BACKEND.emit(schema);
  assert.ok(source.includes('input = input.normalize("NFC");'));
});

test('bytecode emit: bom:reject produces reject-throw preamble line', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = withDials(inferSchema(raw), { bom: 'reject' });
  const source = BYTECODE_BACKEND.emit(schema);
  assert.ok(source.includes('schema rejects BOM'));
});

test('bytecode emit: end-to-end — caseSensitive:false bytecode parser accepts uppercase input', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = withDials(inferSchema(raw), { caseSensitive: false });
  const source = BYTECODE_BACKEND.emit(schema);
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = mkdtempSync(join(here, '.bcode-preamble-'));
  const file = join(dir, 'cron-ci.bcode.ts');
  writeFileSync(file, source);
  try {
    const mod = await import(pathToFileURL(file).href);
    // Cron tokens are lowercase ('*'), so caseSensitive:false is a no-op on
    // tokens — but the command word 'DATE' should fold to 'date' and match
    // the command identifier rule.
    const captures = mod.__parse('* * * * * DATE');
    assert.equal((captures as { __production: string }).__production, 'Cron#0');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('bytecode emit: end-to-end — bom:require bytecode parser rejects unprefixed input', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = withDials(inferSchema(raw), { bom: 'require' });
  const source = BYTECODE_BACKEND.emit(schema);
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = mkdtempSync(join(here, '.bcode-preamble-'));
  const file = join(dir, 'cron-bom.bcode.ts');
  writeFileSync(file, source);
  try {
    const mod = await import(pathToFileURL(file).href);
    assert.throws(() => mod.__parse('* * * * * date'), /requires BOM/);
    // With the BOM prefix, parse succeeds.
    const captures = mod.__parse('﻿* * * * * date');
    assert.equal((captures as { __production: string }).__production, 'Cron#0');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test -w "@parser2/compiler" -- --test-name-pattern="bytecode emit:" 2>&1 | grep -E "^(ok|not ok|# (tests|pass|fail))"
```

Expected: 7 test failures (all `not ok`). The string-equality tests fail because the current `emitGeneratedFile` never injects preamble code; the end-to-end tests fail because the parsers don't apply the dials.

- [ ] **Step 3: Do NOT commit yet** — failing tests are the next-task driver. Continue to Task 3.

---

## Task 3: Wire `emitPreamble` into the bytecode `emitGeneratedFile`

**Files:**
- Modify: `packages/compiler/src/emit/bytecode/index.ts:22` (add `emitPreamble` to the imports)
- Modify: `packages/compiler/src/emit/bytecode/index.ts:41-94` (inject preamble into `__parse` template)

- [ ] **Step 1: Add the import**

In `packages/compiler/src/emit/bytecode/index.ts`, change the imports at lines 20-22 from:

```ts
import type { Backend } from '../backend.ts';
import type { InferredSchema } from '../../model.ts';
import { encodeSchema, type EncodedSchema } from './encoder.ts';
```

to:

```ts
import type { Backend } from '../backend.ts';
import type { InferredSchema } from '../../model.ts';
import { encodeSchema, type EncodedSchema } from './encoder.ts';
import { emitPreamble } from '../v2/index.ts';
```

- [ ] **Step 2: Inject preamble into `__parse` body**

Inside `emitGeneratedFile`, after the existing local variable declarations and before the `return` template-string, add one line that computes the preamble code:

Locate the body of `emitGeneratedFile` (lines 41-94). After `const headerComment = ...;` (currently line 55-57), insert:

```ts
  const preamble = emitPreamble(schema);
```

Then modify the `__parse` template inside the returned string. Current `__parse` template (lines 70-94 of the returned string):

```ts
export function __parse(input: string, options?: { mode?: string }): unknown {
  const mode = options?.mode ?? 'fast';
  if (mode !== 'fast') {
    throw new Error("bytecode-backend parser only supports 'fast' mode; use the TS backend for 'raws'");
  }
  const state = {
    input,
    ...
```

Change to (preamble injected after the `mode` guard, before `const state`):

```ts
export function __parse(input: string, options?: { mode?: string }): unknown {
  const mode = options?.mode ?? 'fast';
  if (mode !== 'fast') {
    throw new Error("bytecode-backend parser only supports 'fast' mode; use the TS backend for 'raws'");
  }
${preamble}  const state = {
    input,
    ...
```

Note: `emitPreamble` already adds the 2-space leading indent and trailing newline (see `v2/index.ts:292`), so the literal `${preamble}` interpolates directly with no extra whitespace adjustment. When `preamble` is the empty string (all defaults — never happens in practice because BOM 'allow' always emits, but possible if BOM is left unset in a hypothetical future schema), the template collapses cleanly.

The complete updated template-string segment for `__parse` reads:

```ts
  return `${headerComment}
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = ${schemaLiteral};
const __OPS_B64: string = ${opsLiteral};
const __DECODED = decodeSchema(__SCHEMA_JSON, __OPS_B64);
const __defaultTarget: string | undefined = ${defaultTargetLiteral};

export function __parse(input: string, options?: { mode?: string }): unknown {
  const mode = options?.mode ?? 'fast';
  if (mode !== 'fast') {
    throw new Error("bytecode-backend parser only supports 'fast' mode; use the TS backend for 'raws'");
  }
${preamble}  const state = {
    input,
    ops: __DECODED.ops,
    stringPool: __DECODED.stringPool,
    numberPool: __DECODED.numberPool,
    off: 0,
    pc: 0,
    maxOff: 0,
    valueStack: [] as unknown[],
  };
  const rootOffset = __DECODED.productionOffsets.get(__DECODED.rootProductionKey);
  if (rootOffset === undefined) {
    throw new Error("bytecode-backend parser: missing root production offset for '" + __DECODED.rootProductionKey + "'");
  }
  const captures = runParse(state, rootOffset);
  if (captures === null || state.off !== input.length) {
    throw syntaxErrorAt(input, state.maxOff > state.off ? state.maxOff : state.off);
  }
  return captures;
}

export function render(input: string, options?: { target?: string; mode?: string }): unknown {
  const target = options?.target ?? __defaultTarget;
  if (target === undefined) {
    throw new Error("render: missing target; pass options.target or set defaultTarget on the schema");
  }
  const captures = __parse(input, options);
  return runRender(__DECODED, captures, target);
}

export function stringify(value: unknown, options?: { target?: string }): string {
  const target = options?.target ?? __defaultTarget;
  if (target === undefined) {
    throw new Error("stringify: missing target; pass options.target or set defaultTarget on the schema");
  }
  return runStringify(__DECODED, value, target);
}
`;
```

The only structural delta versus the existing template is the single `${preamble}` interpolation between the `mode` guard's closing brace and `const state = {`.

- [ ] **Step 3: Run the bytecode-preamble test to verify it now passes**

```bash
npm run test -w "@parser2/compiler" -- --test-name-pattern="bytecode emit:" 2>&1 | grep -E "^(ok|not ok|# (tests|pass|fail))"
```

Expected: 7 `ok` lines, 0 `not ok`.

- [ ] **Step 4: Run the full compiler suite to confirm no regressions**

```bash
npm run test -w "@parser2/compiler" 2>&1 | grep -E "^# (tests|pass|fail|skipped)"
```

Expected: `# tests 385 # pass 385 # fail 0 # skipped 0` (was 378; +7 new tests).

- [ ] **Step 5: Commit both the test file and the emit change**

```bash
git add packages/compiler/test/bytecode-preamble.test.ts packages/compiler/src/emit/bytecode/index.ts
git commit -m "$(cat <<'EOF'
feat(compiler): inline preamble in bytecode __parse wrapper

Reuse v2's emitPreamble() to inject BOM/unicode/newlines/case-fold
dial handling into the bytecode backend's __parse, matching the TS
backend's behavior verbatim. Adds 7 tests covering string emission
per dial plus end-to-end runs for caseSensitive and bom dials.

Closes Phase 8 follow-up #1.
EOF
)"
```

---

## Task 4: Regenerate cron's bytecode parser artifact

Cron uses all-default dials, but `bom: 'allow'` always emits a strip line, so cron's `parser.bcode.ts` will gain exactly one line in `__parse`. This is a deliberate, semantics-preserving change.

**Files:**
- Modify: `packages/cron/src/_generated/parser.bcode.ts` (regenerated)

- [ ] **Step 1: Identify cron's generate command**

```bash
cat packages/cron/package.json | grep -A2 '"generate"'
```

Confirm there's a `generate` script that runs the bytecode emit for cron. (Expected: something like `tsx ../compiler/src/cli/generate.ts ...`.)

- [ ] **Step 2: Run cron's generate command**

```bash
npm run generate -w "@parser2/cron"
```

- [ ] **Step 3: Inspect the diff**

```bash
git diff packages/cron/src/_generated/parser.bcode.ts | head -40
```

Expected: a single new line `  if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);` between the `mode !== 'fast'` block and `const state = {`. No other changes.

- [ ] **Step 4: Run cron tests**

```bash
npm run test -w "@parser2/cron" 2>&1 | grep -E "^# (tests|pass|fail|skipped)"
```

Expected: `# tests 9 # pass 6 # fail 3 # skipped 0` — identical to baseline. The 3 failures are the pre-existing user WIP in `packages/cron/src/index.ts` (replaced `export *` with narrow `{render}` re-export, dropping parse/stringify); they are independent of this work.

- [ ] **Step 5: Run the parser-IR golden test (SHA256 byte-equality gate)**

```bash
npm run test -w "@parser2/parser" 2>&1 | grep -E "^# (tests|pass|fail|skipped)"
```

Expected: `# tests 82 # pass 82 # fail 0 # skipped 0`. The golden only covers `parser.ts` (TS-emit), not `.bcode.ts`, so this stays green without any hash update.

- [ ] **Step 6: Commit the regenerated artifact**

```bash
git add packages/cron/src/_generated/parser.bcode.ts
git commit -m "$(cat <<'EOF'
chore(cron): regenerate bytecode parser with BOM strip preamble

Cron's schema uses default bom:'allow', so the new bytecode preamble
emits one BOM-strip line in __parse. Semantics-preserving — cron
already handled BOM-prefixed input correctly via the TS backend and
the interpreter; this brings the bytecode backend to parity.
EOF
)"
```

---

## Task 5: Verify nothing else regressed across all packages

- [ ] **Step 1: Run the full test matrix**

```bash
for pkg in parser compiler css html markdown cron yaml-block; do
  echo -n "$pkg: "
  npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '
  echo
done
```

Expected:
```
parser: # tests 82 # pass 82 # fail 0 # skipped 0
compiler: # tests 385 # pass 385 # fail 0 # skipped 0
css: # tests 74 # pass 72 # fail 0 # skipped 2
html: # tests 34 # pass 34 # fail 0 # skipped 0
markdown: # tests 76 # pass 76 # fail 0 # skipped 0
cron: # tests 9 # pass 6 # fail 3 # skipped 0
yaml-block: # tests 9 # pass 9 # fail 0 # skipped 0
```

Cron's 3 failures are the pre-existing user WIP — not caused by this plan.

- [ ] **Step 2: Confirm git status shows only docs change pending**

```bash
git status
```

Expected: `packages/cron/src/index.ts` and `packages/cron/bench/parse.ts` modified (pre-existing user WIP), no other untracked or unstaged changes.

---

## Task 6: Update v2-migration-status doc

**Files:**
- Modify: `docs/v2-migration-status.md` (Phase 8 closeout section)

- [ ] **Step 1: Locate the Phase 8 follow-up #1 entry**

```bash
grep -n "Phase 8 #1\|bytecode preamble\|preamble.*bytecode" docs/v2-migration-status.md | head -10
```

- [ ] **Step 2: Mark the entry resolved**

In the Phase 8 closeout section, find the line describing follow-up #1 (bytecode preamble support / dial application). Change its status marker from open to resolved and append the commit SHAs from Tasks 1, 3, and 4 (Task 2's test commit is folded into Task 3's commit). Use the same resolved-entry style as Phase 9 follow-up #2 (commit `7169658`) and Phase 9 follow-up #1 (commit `b47f82a`).

Concrete edit instruction for the executor: locate the bullet starting with `#1` under "Phase 8 closeout" and update it to read approximately:

```markdown
#1 — **Resolved** (commits `<task1>`, `<task3>`, `<task4>`). Bytecode-emitted
parsers now apply the BOM/unicode/newlines/caseSensitive preamble identically
to the TS backend by reusing the v2 emit's `emitPreamble`. Bytecode encoder,
opcode stream, and runtime are unchanged — dials are consumed at emit time.
Tests in `packages/compiler/test/bytecode-preamble.test.ts` cover string
emission per dial plus end-to-end cron with `caseSensitive:false` and
`bom:require`.
```

Use the actual SHAs from `git log --oneline | head -5` after Tasks 1, 3, 4 are committed. Replace `<task1>`, `<task3>`, `<task4>` placeholders with the real SHAs before committing.

- [ ] **Step 3: Commit the doc update**

```bash
git add docs/v2-migration-status.md
git commit -m "$(cat <<'EOF'
docs: Phase 8 follow-up #1 resolved (bytecode preamble support)
EOF
)"
```

- [ ] **Step 4: Final verification**

```bash
git log --oneline | head -10
git status
```

Expected: last 4 commits are this plan's (Task 1, Task 3, Task 4, Task 6); status shows only the pre-existing cron user WIP.

---

## Done criteria

- [ ] All 4 dials (`bom`, `unicode`, `newlines`, `caseSensitive`) verifiably apply through the bytecode path via the new test file.
- [ ] Bytecode `__parse` wrapper contains the same preamble code string the v2 wrapper does for any given schema.
- [ ] `emitPreamble` is shared between v2 and bytecode emitters via a single export.
- [ ] Cron's regenerated `parser.bcode.ts` differs from baseline by exactly the BOM strip line.
- [ ] Test matrix: parser 82, compiler 385 (+7), css 74, html 34, markdown 76, cron 6/9, yaml-block 9. Cron's 3 failures remain (pre-existing user WIP, out of scope).
- [ ] `docs/v2-migration-status.md` reflects Phase 8 #1 resolved with the three commit SHAs.
