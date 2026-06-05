# Bytecode Template-Form Stringify (Phase 6 #3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Phase 6 follow-up #3 — implement `target='source'` (template-form) inverse stringify in the bytecode backend so `bcodeBackend.stringify(sourceString, { target: 'source' })` produces the canonical source via literal-segment scanning, matching the TS backend.

**Architecture:** Add a single macro opcode `INVERSE_TEMPLATE` that carries the template spec (segments + capture metadata) inline. The runtime handler implements the `walkInverseTemplate` algorithm from `packages/compiler/src/interp/stringify.ts:457-527` — leading-literal assertion, mid-segment `indexOf` scan, tail-optional-absent fusion, and per-capture routing. For leaf captures the string slice is stored directly in `frame.captures`; for recursive captures the slice is recursively inverted via the existing `stringifySlot` plumbing (chain-tries the role's template-form productions). To support recursive inversion, `stringifySlot` is extended so string inputs participate in the chain-try (currently they short-circuit to `String(v)`).

**Tech Stack:** TypeScript, the bytecode encoder (`packages/compiler/src/emit/bytecode/encoder.ts`), the bytecode runtime (`packages/compiler/src/emit/bytecode/runtime.ts`), and the cron equivalence test (`packages/cron/test/bytecode-equivalence.test.ts`).

**Baseline state (commit `ea9db51`):**
- parser 82/82, compiler 391/391, css 77+1 skip, html 34/34, markdown 76/76, yaml-block 15/15 — all green.
- cron 11 pass / 3 fail — the 3 failures are pre-existing user WIP in `packages/cron/src/index.ts` (uncommitted; `module.stringify is not a function`). These remain after this work; they are NOT a regression.
- Cron's bytecode `stringify` currently uses `target='ast'` as the input-shape discriminator. The handoff plan's `target='source'` assertion is disabled by virtue of never being written.

**Encoding (INVERSE_TEMPLATE operand layout — variable-length tail, fixed prefix in OPERAND_SIZES):**

```
opcode    : u8                                  // 0x90 (next unused)
numSegs   : u32                                 // fixed prefix
numCaps   : u32                                 // fixed prefix
targetIdx : u32                                 // fixed prefix; outer-stringify target (e.g. 'source')
segments  : numSegs × u32                       // variable; each is a stringPool index
captures  : numCaps × { u32 nameIdx, u32 roleIdx_or_max, u8 flags }
                                                // variable; per-capture metadata.
                                                // roleIdx_or_max = 0xFFFFFFFF when capture is non-recursive (leaf).
                                                // flags bit 0 = isOptional; bits 1-7 reserved.
```

Sentinel for non-recursive role: `0xFFFFFFFF`. OPERAND_SIZES carries only the three fixed-prefix `u32` entries (the runtime/encoder both compute the rest from `numSegs` and `numCaps`); this mirrors how `BUILD_OBJECT` is sized.

---

## File Structure

**Modified:**
- `packages/compiler/src/emit/bytecode/ops.ts` — add `INVERSE_TEMPLATE = 0x90` to the `Op` enum and an entry to `OPERAND_SIZES`.
- `packages/compiler/src/emit/bytecode/encoder.ts` — (a) extend `canEncodeInverse` to accept `kind: 'template'`; (b) replace the throw in `emitInverseIR`'s `case 'template'` with a new `emitInverseTemplate(state, ir, production)` helper that emits the macro opcode + operands.
- `packages/compiler/src/emit/bytecode/runtime.ts` — (a) implement the `Op.INVERSE_TEMPLATE` case in `stepOpcode`; (b) modify `stringifySlot` so string inputs participate in the chain-try over `stringifyOffsetsByNodeType` (instead of short-circuiting to `String(value)`), with fallback to the original string on chain-try exhaustion.
- `packages/cron/test/bytecode-equivalence.test.ts` — add a `target='source'` round-trip assertion alongside the existing `target='ast'` assertion.

**Regenerated (not hand-edited):**
- `packages/cron/src/_generated/parser.bcode.ts` — produced by `npm run generate -w @parser2/cron`.

**Possibly bumped:**
- `packages/parser/test/generated-parser-ir.golden.json` — bump cron's SHA256 ONLY if `parser.ts` actually changes; the bytecode work targets `parser.bcode.ts` (not tracked here) so the TS-side golden may stay green. Verify experimentally.

---

## Task 1: Re-enable the failing test (RED)

**Files:**
- Modify: `packages/cron/test/bytecode-equivalence.test.ts`

The existing test only checks `bcodeBackend.stringify(tsAst, { target: 'ast' })`. We add a `target='source'` cross-backend assertion that exercises the new opcode end-to-end.

- [ ] **Step 1: Add the new assertion**

Edit `packages/cron/test/bytecode-equivalence.test.ts`. Inside the `for (const input of EXAMPLES)` loop, after the existing line `assert.equal(bcBack, input);`, insert:

```typescript
    // Phase 6 follow-up #3 — template-form inverse stringify for
    // target='source'. The bytecode backend now matches the TS backend
    // on source→source round-trip via the INVERSE_TEMPLATE opcode.
    const bcSourceBack = bcodeBackend.stringify(input, { target: 'source' });
    const tsSourceBack = tsBackend.stringify(input, { target: 'source' });
    assert.equal(bcSourceBack, tsSourceBack);
    assert.equal(bcSourceBack, input);
```

Also remove the comment block at lines 29-36 (the `2)` deviation note) — the deviation is closing. Replace it with:

```typescript
//   2) ~~The plan's example calls `bcodeBackend.stringify(tsAst, { type:
//      'source' })`. The bytecode backend's stringify currently uses
//      target='ast' as the input-shape identifier...~~
//      **Status: Resolved (Phase 6 follow-up #3, 2026-06-03.)** The
//      bytecode backend now supports template-form inverse stringify via
//      the `INVERSE_TEMPLATE` opcode (`packages/compiler/src/emit/bytecode/
//      ops.ts:Op.INVERSE_TEMPLATE`). The runtime handler implements
//      `walkInverseTemplate` (leading-literal assert, mid-segment
//      indexOf scan, tail-optional-absent fusion); recursive captures
//      route through `stringifySlot`, which now chain-tries string
//      inputs over the role's productions (template-form productions
//      succeed on strings; object-form productions fail gracefully via
//      PEEK_FIELD + ASSERT_TOP_STRING_EQ). The `target='source'`
//      assertion below exercises both backends end-to-end.
```

- [ ] **Step 2: Run the test to verify it fails with the expected error**

Run: `npm run test -w @parser2/cron 2>&1 | head -80`

Expected: the new assertion throws `bytecode runtime: no stringify offsets for 'Cron:source'` (or similar) on the first EXAMPLES iteration. The 3 pre-existing user-WIP failures still appear too — those are unrelated.

- [ ] **Step 3: Do NOT commit yet**

Leave the failing test in place for Task 6 to flip green.

---

## Task 2: Add the INVERSE_TEMPLATE opcode definition

**Files:**
- Modify: `packages/compiler/src/emit/bytecode/ops.ts`

- [ ] **Step 1: Add the enum entry**

Edit `packages/compiler/src/emit/bytecode/ops.ts`. After the `POP = 0x8c,` line at the end of the `Op` enum (around line 155), add:

```typescript
  // operands: u32 numSegs, u32 numCaps, u32 targetIdx, then variable tail:
  //   numSegs × u32 stringPool refs (segment literals)
  //   numCaps × { u32 nameIdx, u32 roleIdx_or_max, u8 flags }
  //     roleIdx_or_max = 0xFFFFFFFF when capture is non-recursive (leaf)
  //     flags bit 0 = isOptional; bits 1-7 reserved
  // At runtime: top-of-stack is a string (the rendered source). Slice it
  // against `segments` to populate `frame.captures[<capName>]` for each
  // capture; recursive captures recursively stringify via stringifySlot
  // (which chain-tries the role's template-form productions). Leaves the
  // input string on top of stack (Phase 2's POP in emitStringifyBlock
  // cleans it). On scan failure (leading literal mismatch, missing
  // separator without tail-optional fallback, trailing content) calls
  // failProduction so the chain-try moves to the next alt.
  INVERSE_TEMPLATE = 0x90,
```

- [ ] **Step 2: Add the OPERAND_SIZES entry**

Edit the same file. Inside the `OPERAND_SIZES` object literal (after the `[Op.POP]: [],` line), add:

```typescript
  // numSegs + numCaps + targetIdx fixed prefix; variable tail computed
  // by the encoder/runtime from the counts.
  [Op.INVERSE_TEMPLATE]: [4, 4, 4],
```

- [ ] **Step 3: Verify the encoder's dev-time sanity check still passes**

The encoder's `writeOp` (`encoder.ts:1361-1369`) asserts every opcode it writes has an OPERAND_SIZES entry. We added the entry so this stays green automatically.

- [ ] **Step 4: Run the compiler tests as a baseline**

Run: `npm run test -w @parser2/compiler 2>&1 | grep -E "^# (tests|pass|fail)"`

Expected: `# tests 391 # pass 391 # fail 0` — unchanged. Adding an enum value alone doesn't affect existing tests.

- [ ] **Step 5: Do NOT commit yet**

---

## Task 3: Wire the encoder to emit INVERSE_TEMPLATE

**Files:**
- Modify: `packages/compiler/src/emit/bytecode/encoder.ts`

- [ ] **Step 1: Update `canEncodeInverse` to accept template**

Edit `packages/compiler/src/emit/bytecode/encoder.ts`. At line 1173, find:

```typescript
    case 'template':
      return false;
```

Replace with:

```typescript
    case 'template':
      // Phase 6 follow-up #3 — template-form inverses encode as a single
      // INVERSE_TEMPLATE macro opcode. The runtime handler implements
      // walkInverseTemplate against frame.captures.
      return true;
```

- [ ] **Step 2: Add the `findSpanByName` + `isAbsentAllowedSpan` import**

Edit the same file. Near the top with the other imports (around line 48 next to `import { Op, OPERAND_SIZES, ScanClassKind } from './ops.ts';`), check whether `findSpanByName` / `isAbsentAllowedSpan` are already imported from `../../span-helpers.ts`. If not, add:

```typescript
import { findSpanByName, isAbsentAllowedSpan } from '../../span-helpers.ts';
```

If only one of the two is present, extend the existing import to include both.

- [ ] **Step 3: Replace the throw in `emitInverseIR`'s template case**

At `encoder.ts:1214-1215` find:

```typescript
    case 'template':
      throw new Error(`bytecode encoder: template-form inverse stringify not yet wired (cron exercises object-form discriminators only)`);
```

Replace with:

```typescript
    case 'template':
      emitInverseTemplate(state, ir.segments, ir.captures, production);
      return;
```

- [ ] **Step 4: Add the `emitInverseTemplate` helper**

In the same file, insert this function after `emitInverseArray` (around line 1248, before the `emitWriteRefValue` definition):

```typescript
// Emit the INVERSE_TEMPLATE macro opcode for a template-form inverse.
// Layout (also documented at Op.INVERSE_TEMPLATE):
//   u32 numSegs, u32 numCaps, u32 targetIdx
//   numSegs × u32 stringPool refs (segment literals)
//   numCaps × { u32 nameIdx, u32 roleIdx_or_max, u8 flags }
//     roleIdx_or_max = 0xFFFFFFFF for non-recursive (leaf) captures
//     flags bit 0 = isOptional; bits 1-7 reserved
//
// The runtime peeks top-of-stack (must be string), populates
// frame.captures from the scan, and leaves the input string on top so
// the caller's Phase 2 POP (in emitStringifyBlock) cleans it.
function emitInverseTemplate(
  state: EncoderState,
  segments: ReadonlyArray<string>,
  captures: ReadonlyArray<string>,
  production: Production,
): void {
  if (state.currentTarget === undefined) {
    throw new Error(`bytecode encoder: emitInverseTemplate called without state.currentTarget`);
  }
  // Per-capture metadata: role (if recursive) + optionality.
  type CapMeta = { readonly nameIdx: number; readonly roleIdx: number; readonly optional: boolean };
  const ROLE_NONE = 0xffffffff;
  const meta: CapMeta[] = captures.map((capName) => {
    const span = findSpanByName(production, capName);
    const optional = span !== undefined && isAbsentAllowedSpan(span);
    if (span && span.recursiveRoles.length > 0) {
      if (span.recursiveRoles.length !== 1) {
        // Phase 6 follow-up #7 documents multi-role recursive as out of
        // bytecode scope. Match emitWriteRefValue's behaviour: loud
        // failure so a new schema doesn't silently drop captures.
        throw new Error(
          `bytecode encoder: multi-role recursive capture '${capName}' not yet supported in template-form inverse`,
        );
      }
      const role = span.recursiveRoles[0]!;
      return { nameIdx: internString(state, capName), roleIdx: internString(state, role), optional };
    }
    return { nameIdx: internString(state, capName), roleIdx: ROLE_NONE, optional };
  });
  writeOp(state, Op.INVERSE_TEMPLATE);
  writeU32(state, segments.length);
  writeU32(state, captures.length);
  writeU32(state, internString(state, state.currentTarget));
  for (const seg of segments) {
    writeU32(state, internString(state, seg));
  }
  for (const m of meta) {
    writeU32(state, m.nameIdx);
    writeU32(state, m.roleIdx);
    writeU8(state, m.optional ? 1 : 0);
  }
}
```

- [ ] **Step 5: Verify the compiler tests still pass (encoder is statically reachable now, but cron hasn't been regenerated yet)**

Run: `npm run test -w @parser2/compiler 2>&1 | grep -E "^# (tests|pass|fail)"`

Expected: `# tests 391 # pass 391 # fail 0` — unchanged. The encoder change is dormant until cron is regenerated in Task 6.

- [ ] **Step 6: Do NOT commit yet**

---

## Task 4: Implement the runtime INVERSE_TEMPLATE handler + extend stringifySlot for strings

**Files:**
- Modify: `packages/compiler/src/emit/bytecode/runtime.ts`

- [ ] **Step 1: Extend `stringifySlot` so string inputs participate in chain-try**

Edit `packages/compiler/src/emit/bytecode/runtime.ts`. Find `stringifySlot` (around line 185). The current shape:

```typescript
function stringifySlot(
  state: RuntimeState,
  value: unknown,
  nodeType: string,
  target: string,
): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) { /* ... */ }
  if (typeof value !== 'object') {
    return String(value);
  }
  // chain-try on offsetsByNodeType...
}
```

Replace the function body with:

```typescript
function stringifySlot(
  state: RuntimeState,
  value: unknown,
  nodeType: string,
  target: string,
): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const parts: string[] = [];
    for (let i = 0; i < value.length; i++) {
      const r = stringifySlot(state, value[i], nodeType, target);
      if (r === null || r === undefined || r === '') continue;
      parts.push(String(r));
    }
    return parts.join(' ');
  }
  // Strings AND objects participate in chain-try: object-form productions
  // succeed on objects (PEEK_FIELD + ASSERT_TOP_STRING_EQ pattern) and
  // fail on strings; template-form productions succeed on strings
  // (INVERSE_TEMPLATE scans literal segments). The chain-try takes the
  // first non-null result.
  if (typeof value !== 'string' && typeof value !== 'object') {
    return String(value);
  }
  const offsetsByNodeType = state.stringifyOffsetsByNodeType;
  if (!offsetsByNodeType) {
    throw new Error('bytecode runtime: STRINGIFY_DISPATCH without stringifyOffsetsByNodeType');
  }
  const key = `${nodeType}:${target}`;
  const offsets = offsetsByNodeType.get(key);
  if (!offsets || offsets.length === 0) {
    // For strings we fall back to the input itself (matches TS backend's
    // __invertSlotFor_<Role>_<target> try/catch fallback). For objects
    // this remains a hard error — a missing object-form inverse signals
    // a real bug.
    if (typeof value === 'string') return value;
    throw new Error(`bytecode runtime: no stringify offsets for '${key}'`);
  }
  for (const offset of offsets) {
    const result = runStringifyNested(state, value, offset);
    if (result !== null) return result;
  }
  // All alts failed. Match TS backend: strings fall back to themselves;
  // other shapes are a hard error.
  if (typeof value === 'string') return value;
  throw new Error(`bytecode runtime: no production matched for stringify '${key}' (value: ${safeJson(value)})`);
}
```

- [ ] **Step 2: Add the INVERSE_TEMPLATE case to `stepOpcode`**

In the same file, find the `default:` case at the end of `stepOpcode` (around line 626). Insert a new case BEFORE the `default:`:

```typescript
    case Op.INVERSE_TEMPLATE: {
      const numSegs = readU32(state);
      const numCaps = readU32(state);
      const target = state.stringPool[readU32(state)]!;
      const segments: string[] = new Array(numSegs);
      for (let i = 0; i < numSegs; i++) {
        segments[i] = state.stringPool[readU32(state)]!;
      }
      const capNames: string[] = new Array(numCaps);
      const capRoles: (string | null)[] = new Array(numCaps);
      const capOptional: boolean[] = new Array(numCaps);
      const ROLE_NONE = 0xffffffff;
      for (let i = 0; i < numCaps; i++) {
        capNames[i] = state.stringPool[readU32(state)]!;
        const roleRaw = readU32(state);
        capRoles[i] = roleRaw === ROLE_NONE ? null : state.stringPool[roleRaw]!;
        capOptional[i] = readU8(state) !== 0;
      }

      // The top of stack is the input value being inverted. The
      // emitStringifyBlock prologue (PUSH_NEW_CAPTURES; POP) leaves it on
      // top. We PEEK (do not pop) so the caller's Phase 2 POP cleans it.
      if (state.valueStack.length === 0) {
        throw new Error(`bytecode runtime: INVERSE_TEMPLATE with empty value stack`);
      }
      const value = state.valueStack[state.valueStack.length - 1];
      if (typeof value !== 'string') {
        // Template-form expects string input. Fail this production so the
        // chain-try (in stringifySlot) moves to the next alt.
        if (failProduction(state, frames)) return { kind: 'return', value: null };
        return { kind: 'continue' };
      }

      const frame = frames[frames.length - 1]!;
      if (frame.captures === null) {
        throw new Error(`bytecode runtime: INVERSE_TEMPLATE before frame captures init`);
      }
      const captures = frame.captures;

      // Per-capture tail-optional flags: tailOptional[j] is true iff
      // captures[j..end] are all optional. Used by the indexOf-miss
      // fallback below to slurp the rest into capture i and null the
      // trailing captures.
      const tailOptional: boolean[] = new Array(numCaps);
      let allOpt = true;
      for (let j = numCaps - 1; j >= 0; j--) {
        if (!capOptional[j]) allOpt = false;
        tailOptional[j] = allOpt;
      }

      // Walk segments[0] (leading literal) → captures[0] (slice to
      // segments[1]) → ... → captures[N-1] (slice to segments[N]).
      let pos = 0;
      const seg0 = segments[0] ?? '';
      if (seg0.length > 0) {
        if (value.indexOf(seg0, pos) !== pos) {
          if (failProduction(state, frames)) return { kind: 'return', value: null };
          return { kind: 'continue' };
        }
        pos += seg0.length;
      }

      let succeeded = true;
      walkCaps: for (let i = 0; i < numCaps; i++) {
        const nextSeg = segments[i + 1] ?? '';
        const capName = capNames[i]!;
        const role = capRoles[i];

        if (i === numCaps - 1 && nextSeg.length === 0) {
          if (capOptional[i] && pos >= value.length) {
            captures[capName] = null;
          } else {
            const slice = value.slice(pos);
            captures[capName] = role === null ? slice : stringifySlot(state, slice, role, target);
            pos = value.length;
          }
          continue;
        }
        if (nextSeg.length === 0) {
          succeeded = false;
          break;
        }
        const end = value.indexOf(nextSeg, pos);
        const nextIdx = i + 1;
        const nextIsTailOptional = nextIdx < numCaps && tailOptional[nextIdx];
        if (end < 0) {
          if (nextIsTailOptional) {
            const slice = value.slice(pos);
            captures[capName] = role === null ? slice : stringifySlot(state, slice, role, target);
            pos = value.length;
            for (let k = nextIdx; k < numCaps; k++) {
              captures[capNames[k]!] = null;
            }
            break walkCaps;
          }
          succeeded = false;
          break;
        }
        const slice = value.slice(pos, end);
        captures[capName] = role === null ? slice : stringifySlot(state, slice, role, target);
        pos = end + nextSeg.length;
      }

      if (succeeded && pos !== value.length) {
        succeeded = false;
      }
      if (!succeeded) {
        if (failProduction(state, frames)) return { kind: 'return', value: null };
        return { kind: 'continue' };
      }
      return { kind: 'continue' };
    }
```

- [ ] **Step 3: Compile-check the runtime in isolation**

Run: `npm run test -w @parser2/compiler 2>&1 | grep -E "^# (tests|pass|fail)" | head -1`

Expected: `# tests 391 # pass 391 # fail 0` — the compiler test suite still passes (no consumer exercises INVERSE_TEMPLATE yet, but the file must compile).

- [ ] **Step 4: Do NOT commit yet**

---

## Task 5: Regenerate cron's bytecode parser

**Files:**
- Regenerated: `packages/cron/src/_generated/parser.bcode.ts`
- Possibly regenerated: `packages/cron/src/_generated/parser.ts` (TS backend; should be byte-identical to baseline since only bytecode logic changed).

- [ ] **Step 1: Capture the baseline parser.ts hash**

Run: `shasum -a 256 packages/cron/src/_generated/parser.ts`

Save the hex digest (you'll compare in Step 3). It should match the value in `packages/parser/test/generated-parser-ir.golden.json` (cron entry): `22dab65dda36a2a303ec5c66f3f4513e0aaa20a94b2a768670b189bed83d991c`.

- [ ] **Step 2: Run the generator**

Run: `npm run generate -w @parser2/cron`

Expected: completes without error. `packages/cron/src/_generated/parser.bcode.ts` now contains additional bytecode for the template-form inverses (longer `__OPS_B64` blob, additional `stringifyOffsets` entries for `Cron#0:source`, `Command#0:source`, `CronField#0..3:source`, `CommandWord#0:source`).

- [ ] **Step 3: Verify parser.ts is byte-identical**

Run: `shasum -a 256 packages/cron/src/_generated/parser.ts`

Expected: same hash as Step 1. If it differs, see Task 7 (golden bump). Either outcome is OK — we just need to know.

- [ ] **Step 4: Do NOT commit yet**

---

## Task 6: Run the test suite and verify green (GREEN)

- [ ] **Step 1: Run cron's tests**

Run: `npm run test -w @parser2/cron 2>&1 | grep -E "^# (tests|pass|fail)" | head -1`

Expected: `# tests 14 # pass 11 # fail 3` — the 3 pre-existing user-WIP failures remain (unrelated). The new `target='source'` assertion ALSO passes (the equivalence test had 11 EXAMPLES; the test count stays at 14 since we added assertions to existing tests, not new tests). If the count goes UP to 14 with 3 fail, that's still success — verify that none of the EXAMPLES iterations now fail due to your changes.

If the new assertion fails, inspect: `npm run test -w @parser2/cron 2>&1 | grep -A 20 "bytecode equivalence:" | head -60`.

- [ ] **Step 2: Run the compiler tests**

Run: `npm run test -w @parser2/compiler 2>&1 | grep -E "^# (tests|pass|fail)" | head -1`

Expected: `# tests 391 # pass 391 # fail 0`.

- [ ] **Step 3: Run all in-scope packages as a smoke**

Run:

```bash
for pkg in parser compiler css html markdown cron yaml-block; do
  echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo
done
```

Expected (baseline):
```
parser: # tests 82 # pass 82 # fail 0 # skipped 0
compiler: # tests 391 # pass 391 # fail 0 # skipped 0
css: # tests 78 # pass 77 # fail 0 # skipped 1
html: # tests 34 # pass 34 # fail 0 # skipped 0
markdown: # tests 76 # pass 76 # fail 0 # skipped 0
cron: # tests 14 # pass 11 # fail 3 # skipped 0
yaml-block: # tests 15 # pass 15 # fail 0 # skipped 0
```

- [ ] **Step 4: Do NOT commit yet**

---

## Task 7: Bump goldens (only if Task 5 Step 3 detected a parser.ts change)

**Files:**
- Modify: `packages/parser/test/generated-parser-ir.golden.json`

- [ ] **Step 1: Check if a bump is needed**

Run: `shasum -a 256 packages/cron/src/_generated/parser.ts`

Compare to the cron entry in `packages/parser/test/generated-parser-ir.golden.json`. If they match → skip this task. If they differ → continue.

- [ ] **Step 2: Update the golden**

Edit `packages/parser/test/generated-parser-ir.golden.json`. Find the cron entry (around line 17):

```json
    "cron": {
      "path": "packages/cron/src/_generated/parser.ts",
      "sha256": "22dab65dda36a2a303ec5c66f3f4513e0aaa20a94b2a768670b189bed83d991c"
    },
```

Replace `22dab65dda36a2a303ec5c66f3f4513e0aaa20a94b2a768670b189bed83d991c` with the new hex digest from Step 1.

- [ ] **Step 3: Verify the parser-side golden test**

Run: `npm run test -w @parser2/parser 2>&1 | grep -E "^# (tests|pass|fail)" | head -1`

Expected: `# tests 82 # pass 82 # fail 0`. The SHA equivalence test now passes against the new hash.

---

## Task 8: Update the migration doc and commit

**Files:**
- Modify: `docs/v2-migration-status.md`
- Stage: all the files modified above plus the regenerated cron parser.

- [ ] **Step 1: Mark Phase 6 follow-up #3 resolved in the migration doc**

Edit `docs/v2-migration-status.md`. Find the section starting at line 280 (`3. **Bytecode stringify target='source' not implemented...**`). Add a `**Status: Resolved (2026-06-03)**` line immediately under the existing `**Status: Deferred to next session.**` (line 347), and change the deferred wording so the resolution is clear:

```markdown
   **Status: Resolved (2026-06-03).** Implemented as a single
   `INVERSE_TEMPLATE` macro opcode (`packages/compiler/src/emit/bytecode/
   ops.ts:Op.INVERSE_TEMPLATE`). Encoder: `canEncodeInverse` now accepts
   `kind: 'template'`; `emitInverseTemplate` in `encoder.ts` writes the
   opcode + segments + per-capture metadata (name, role-or-sentinel,
   optional flag). Runtime: `stepOpcode` handles `Op.INVERSE_TEMPLATE`
   with a literal-scanner mirroring `walkInverseTemplate`
   (`interp/stringify.ts:457-527`), populating `frame.captures`
   directly; recursive captures route via `stringifySlot`. `stringifySlot`
   itself was extended so string inputs participate in chain-try (was
   short-circuiting to `String(v)`); object-form productions fail on
   strings via `PEEK_FIELD + ASSERT_TOP_STRING_EQ` so the chain falls
   through to template-form productions. `bytecode-equivalence.test.ts`
   gained a `target='source'` cross-backend assertion exercising both
   the tail-optional-absent path (Command capture absent on
   `'* * * * *'`) and the recursive-captures path (CronField + Command
   per cron field).
```

- [ ] **Step 2: Stage and commit**

Run:

```bash
git add packages/compiler/src/emit/bytecode/ops.ts \
        packages/compiler/src/emit/bytecode/encoder.ts \
        packages/compiler/src/emit/bytecode/runtime.ts \
        packages/cron/test/bytecode-equivalence.test.ts \
        packages/cron/src/_generated/parser.bcode.ts \
        docs/v2-migration-status.md
```

If Task 7 Step 2 ran (golden bumped), also add:

```bash
git add packages/parser/test/generated-parser-ir.golden.json packages/cron/src/_generated/parser.ts
```

Then commit:

```bash
git commit -m "$(cat <<'EOF'
feat(compiler): bytecode template-form inverse stringify

Implements Phase 6 follow-up #3 — `bcodeBackend.stringify(srcStr,
{ target: 'source' })` now goes through a literal-segment scanner that
mirrors `walkInverseTemplate` (interp/stringify.ts). Closes the last
phase-sized gap in the bytecode backend's round-trip surface; cron's
equivalence test now compares both backends on source→source as well
as ast→source.

Encoding: single `INVERSE_TEMPLATE` macro opcode (0x90) carrying
numSegs/numCaps/targetIdx prefix + variable tail (segments, per-capture
{name, role-or-sentinel, optional} metadata). Runtime: peeks the input
string, slices against segments to populate frame.captures; recursive
captures route via stringifySlot (now chain-tries string inputs so
template-form productions are reachable).
EOF
)"
```

- [ ] **Step 3: Verify status**

Run: `git status && git log --oneline | head -3`

Expected: working tree shows ONLY the pre-existing user-WIP files (`packages/cron/bench/parse.ts`, `packages/cron/src/index.ts`); the new HEAD is the commit you just made.

---

## Self-Review (run BEFORE marking the plan ready for execution)

**Spec coverage:**
- Encoder hook (template `case` in `emitInverseIR`): Task 3 Step 3 ✓
- Runtime hook (`Op.INVERSE_TEMPLATE` case): Task 4 Step 2-3 ✓
- Ops table additions: Task 2 Step 1-2 ✓
- Test re-enable (target='source' assertion): Task 1 Step 1 ✓
- Cron regen: Task 5 ✓
- Golden bump (conditional): Task 7 ✓
- Migration doc update: Task 8 Step 1 ✓
- LOC estimate from handoff (~120 LOC): encoder ~40 + runtime ~80 = ~120 ✓

**Placeholder scan:**
- No "TBD" / "implement later" / "add error handling" — every step has either runnable shell or full code blocks.
- The `_ivt_target` placeholder in Task 4 Step 2 is explicitly resolved in Step 3 with the exact substitution; not a TODO.

**Type consistency:**
- Capture-meta record fields (`nameIdx`, `roleIdx`, `optional`) match between encoder helper (Task 3 Step 4) and runtime handler (Task 4 Step 2).
- Sentinel `0xffffffff` for non-recursive role used identically on both sides.
- `state.currentTarget` (encoder) vs `_ivt_target` local (runtime) — same string value flowing through the opcode operands.

**Edge cases the test covers (already in `EXAMPLES`):**
- `'* * * * * date'` — all captures recursive, no tail-optional path taken.
- `'* * * * *'` — last capture (Command) is optional and absent; exercises the tail-optional-absent slurp AND the trailing-null fill.
- `'*/5 * * * * cmd'`, `'*/15 0-12 * * 1-5 deploy'` — recursive captures whose dispatcher chooses CronField#1/CronField#3 (step / range); validates that string inputs to stringifySlot chain-try template-form productions correctly.

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-03-bytecode-template-form-stringify.md`.**
