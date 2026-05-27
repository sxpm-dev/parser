# Phase 6 — Pluggable backend interface + bytecode backend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the compiler so codegen targets are pluggable behind a `Backend` interface, register the existing v2 TS emit as the `'ts'` backend, and add a `'bytecode'` backend that serializes `InferredSchema` into an opcode stream and ships a small runtime interpreter. The reference interpreter from Phase 2 is the specification both backends match.

**Architecture:** A `Backend` interface (`name`, `fileExtension`, `emit(schema)`) lives in `packages/compiler/src/emit/backend.ts`. The TS backend wraps `emitV2Parser`. The bytecode backend has three subcomponents: opcode enum (`bytecode/ops.ts`), encoder (`bytecode/encoder.ts` — walks `InferredSchema` → `Uint8Array` opcode stream + string pool + number pool), and runtime (`bytecode/runtime.ts` — ~30 KB interpreter that reads the opcode stream and executes parse/render/stringify). CLI gains `--backend ts|bytecode`. Cron is the exit-gate schema (small, simple, full parse+render+stringify+inverse coverage).

**Tech Stack:** TypeScript 5.x (Node 20+), tsx for codegen, `node:test` for regressions. Bytecode uses `Uint8Array` for the opcode stream and `string[]` / `number[]` for pools. No new runtime dependencies.

---

## Pre-flight: working directory + baseline

Working directory: `/Users/valerii/Develop/parser3_codex/.claude/worktrees/engine+v2-and-theorems`.

Baseline after Phase 5 closeout (verify before starting):

```bash
npm run test -w @parser2/parser 2>&1   | grep -E "^# (tests|pass|fail|skipped)"
npm run test -w @parser2/compiler 2>&1 | grep -E "^# (tests|pass|fail|skipped)"
npm run test -w @parser2/css 2>&1      | grep -E "^# (tests|pass|fail|skipped)"
npm run test -w @parser2/html 2>&1     | grep -E "^# (tests|pass|fail|skipped)"
npm run test -w @parser2/markdown 2>&1 | grep -E "^# (tests|pass|fail|skipped)"
```

Expected: parser 25/25, compiler 312/312, css 56/57 (1 skip), html 30/30, markdown 76/76.

Cron baseline (Phase 6 uses cron as the exit-gate schema — out of normal in-scope but reactivated for this phase only):

```bash
npm run test -w @parser2/cron 2>&1 | grep -E "^# (tests|pass|fail|skipped)"
```

Expected: 9/9 (last known good — verify before starting).

---

## Scope decisions

1. **Exit-gate schema:** `cron` (~1k LOC generated TS, full parse+render+stringify+inverse, recursive children, validators). Per master plan.
2. **In-scope packages stay green:** css, html, markdown via the `'ts'` backend must continue to pass throughout the phase. The refactor in Task 6.1 is the highest-risk regression vector — guard it carefully.
3. **Bytecode runtime budget:** total runtime + opcode stream + pools per generated parser ≤ 50 KB. Verified in Task 6.7.
4. **Bytecode perf budget:** throughput within 2× of TS backend on a representative cron input. Verified in Task 6.7.
5. **Feature scope for bytecode backend:**
   - **In-scope:** parse path; render (captures-based dispatch); inverse stringify; validators (if cron uses any).
   - **Out-of-scope:** fused render path (Phase 5 fusion). The bytecode runtime emits the captures-based render path only. The TS backend keeps fusion; bytecode defers it as a possible future task.
   - **Out-of-scope:** raws mode (`mode: 'raws'`). Bytecode parse is fast mode only. Schemas needing raws (none of cron/css/html/markdown do for the public API today) fall back to the TS backend.
6. **CLI shape:** `--backend ts` is the default; `--backend bytecode` opts in. Generated files use the backend's `fileExtension` (`.ts` vs `.bcode.ts`). Bytecode backend emits a `.ts` wrapper that imports the runtime + embeds the opcode stream as a base64 string OR a separate `.bcode` file with a `import bytecode from './schema.bcode' assert { type: 'bytes' }` import.

**Decision deferred to Task 6.2:** inline base64 vs separate `.bcode` file. Pick during Task 6.2 implementation; document the choice in this plan as a comment.

---

## File-touch map

**New files:**
- `packages/compiler/src/emit/backend.ts` — `Backend` interface
- `packages/compiler/src/emit/bytecode/ops.ts` — opcode enum + size constants
- `packages/compiler/src/emit/bytecode/encoder.ts` — `InferredSchema` → opcode stream + pools
- `packages/compiler/src/emit/bytecode/runtime.ts` — opcode-stream interpreter (parse/render/stringify)
- `packages/compiler/src/emit/bytecode/index.ts` — `Backend` registration
- `packages/compiler/src/emit/ts.ts` — `Backend` registration wrapping `emit/v2/index.ts`
- `packages/compiler/test/backend.test.ts` — backend-interface unit tests
- `packages/compiler/test/bytecode-roundtrip.test.ts` — cron full lifecycle via bytecode

**Modified files:**
- `packages/compiler/src/cli.ts` — `--backend` flag
- `packages/compiler/src/index.ts` — `generateParser` accepts `backend` option (default `'ts'`)
- `packages/cron/package.json` — possibly a generate script for the bytecode backend (added in Task 6.6)
- `docs/v2-migration-status.md` — Phase 6 closeout notes (Task 6.8)
- `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md` — Phase 6 marked closed (Task 6.8)

**Out-of-scope:** the 7 OTHER out-of-scope packages stay frozen on their existing generated TS parsers. We do NOT regenerate them for bytecode.

---

## Task 6.1: Backend interface + extract TS backend

**Why first:** the refactor must land cleanly with all in-scope tests green BEFORE adding any new backend. This task is pure plumbing — no new behavior, just reorganization.

**Files:**
- Create: `packages/compiler/src/emit/backend.ts`
- Create: `packages/compiler/src/emit/ts.ts`
- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/src/cli.ts`
- Test: `packages/compiler/test/backend.test.ts`

- [ ] **Step 1: Failing test.** Create `packages/compiler/test/backend.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { TS_BACKEND } from '../src/emit/ts.ts';
import type { Backend } from '../src/emit/backend.ts';

test('backend: ts backend conforms to Backend interface', () => {
  const b: Backend = TS_BACKEND;
  assert.equal(b.name, 'ts');
  assert.equal(b.fileExtension, '.ts');
  assert.equal(typeof b.emit, 'function');
});
```

- [ ] **Step 2: Run, expect failure.**

```bash
npx tsx --test packages/compiler/test/backend.test.ts 2>&1 | grep -E "not ok|Cannot find"
```

Expected: import-failure (the modules don't exist yet).

- [ ] **Step 3: Create `backend.ts`.**

```ts
// packages/compiler/src/emit/backend.ts
import type { InferredSchema } from '../model.ts';

export interface Backend {
  readonly name: string;
  readonly fileExtension: string;
  emit(schema: InferredSchema): string;
}
```

- [ ] **Step 4: Create `ts.ts`.**

```ts
// packages/compiler/src/emit/ts.ts
import type { InferredSchema } from '../model.ts';
import { emitV2Parser } from './v2/index.ts';
import type { Backend } from './backend.ts';

export const TS_BACKEND: Backend = {
  name: 'ts',
  fileExtension: '.ts',
  emit(schema: InferredSchema): string {
    return emitV2Parser(schema);
  },
};
```

- [ ] **Step 5: Wire CLI to use the backend.** Read `packages/compiler/src/cli.ts` to understand the current shape. Then add `--backend ts|bytecode` flag handling (default `'ts'`):

```ts
// In cli.ts, near argv parsing:
const backendName = parseFlag('--backend', argv) ?? 'ts';
const backend: Backend = backendName === 'ts' ? TS_BACKEND :
                          backendName === 'bytecode' ? BYTECODE_BACKEND :
                          (() => { throw new Error(`Unknown backend: ${backendName}`); })();
// ... later where the current code calls emitV2Parser(schema):
const source = backend.emit(schema);
const outPath = inferOutPath(schemaPath, backend.fileExtension);
writeFileSync(outPath, source);
```

(For Task 6.1 the `BYTECODE_BACKEND` reference doesn't exist yet. Stub it as `throw new Error('bytecode backend not registered')` in cli.ts, OR gate the import behind the flag value. Pick whichever keeps the import graph clean.)

- [ ] **Step 6: Wire `generateParser` public API to accept backend.** In `packages/compiler/src/index.ts`, add an optional `backend?: Backend` field to the options arg. Default to `TS_BACKEND`. Existing callers stay unchanged.

- [ ] **Step 7: Run all in-scope suites.**

```bash
npm run test -w @parser2/compiler 2>&1 | grep -E "^# (tests|pass|fail)"
npm run test -w @parser2/css 2>&1      | grep -E "^# (tests|pass|fail|skipped)"
npm run test -w @parser2/html 2>&1     | grep -E "^# (tests|pass|fail)"
npm run test -w @parser2/markdown 2>&1 | grep -E "^# (tests|pass|fail)"
```

Expected: compiler 313/313 (+1 for backend test), css/html/markdown unchanged.

- [ ] **Step 8: Commit.**

```bash
git add packages/compiler/src/emit/backend.ts packages/compiler/src/emit/ts.ts \
        packages/compiler/src/index.ts packages/compiler/src/cli.ts \
        packages/compiler/test/backend.test.ts
git commit -m "refactor(v2): extract Backend interface; register TS backend (Task 6.1)"
```

---

## Task 6.2: Opcode set + encoder skeleton

**Why:** define the bytecode language. The opcode set has to be small enough that the runtime stays under budget AND complete enough to express every InferredSchema construct cron uses.

**Files:**
- Create: `packages/compiler/src/emit/bytecode/ops.ts`
- Create: `packages/compiler/src/emit/bytecode/encoder.ts`
- Create: `packages/compiler/src/emit/bytecode/index.ts`
- Test: `packages/compiler/test/bytecode-encoder.test.ts`

- [ ] **Step 1: Failing test.** Create `packages/compiler/test/bytecode-encoder.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { encodeSchema } from '../src/emit/bytecode/encoder.ts';
import { inferSchema } from '../src/index.ts';

test('bytecode encoder: cron schema produces a non-empty opcode stream', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = inferSchema(raw);
  const { ops, stringPool, numberPool, productionOffsets } = encodeSchema(schema);
  assert.ok(ops instanceof Uint8Array, 'ops must be Uint8Array');
  assert.ok(ops.byteLength > 0, 'cron should produce a non-empty opcode stream');
  assert.ok(stringPool.length > 0, 'cron schema has literal strings');
  assert.ok(productionOffsets.size > 0, 'cron has productions');
});
```

- [ ] **Step 2: Run, expect failure.**

```bash
npx tsx --test packages/compiler/test/bytecode-encoder.test.ts 2>&1 | grep "not ok"
```

- [ ] **Step 3: Define the opcode set.** Create `packages/compiler/src/emit/bytecode/ops.ts`:

```ts
// Opcode enum. Single-byte opcodes; operands follow inline. Variable-length
// operands use ULEB128 encoding (TODO Task 6.3 — for now use fixed 32-bit).
//
// Stack model: parse functions operate on a `state` (input, off, len, maxOff)
// plus a value stack. Each opcode either advances `off`, pushes a value, or
// branches. RETURN_OK pops the top of the value stack and returns it.
// RETURN_NULL clears the local frame's pushes and returns null.
export enum Op {
  // Position primitives
  CONSUME_LITERAL = 0x01,  // operand: stringPool index → require input.startsWith(s) at off; advance off+= s.length; on miss: fail
  CONSUME_BYTE_IN_SET = 0x02, // operand: 256-bit bitset (32 bytes inline) → require input[off] in set; advance off
  SKIP_WS = 0x03,          // skip 0x20 0x09 0x0a 0x0d (no operands)

  // Capture primitives
  SAVE_OFF = 0x10,         // operand: u8 slot → save current off into local slot
  RESTORE_OFF = 0x11,      // operand: u8 slot → restore off from local slot (used on failure)
  CAPTURE_SLICE = 0x12,    // operand: u8 startSlot, u8 endSlot, stringPool index (capture name) → push captures[name] = input.slice(start, end)

  // Scan primitives
  SCAN_CLASS = 0x20,       // operand: u8 class-kind enum (1=ident, 2=number, 3=hex, ...), u8 refKeyStringPoolIdx → advance off through class scanner
  SCAN_UNTIL = 0x21,       // operand: stringPool[] of stops (count + indices), token-class bitmask → advance off until any stop matches (or fail)
  SCAN_UNTIL_AC = 0x22,    // operand: AC table reference (built at encode time, stored in scanTable pool) → AC-driven scan

  // Control flow
  CALL_PRODUCTION = 0x30,  // operand: productionOffset (i32) → recursive call into another production's bytecode block
  RETURN_OK = 0x40,        // pop captures stack frame, set state.pos, return captures
  RETURN_NULL = 0x41,      // set state.pos = entryOff, return null
  JUMP = 0x50,             // operand: i32 relative offset
  JUMP_IF_PEEK_BYTE = 0x51, // operand: byte value, i32 relative offset → if input[off] === byte, jump
  JUMP_IF_NULL = 0x52,     // operand: i32 relative offset → if top-of-stack is null, jump

  // Captures construction
  PUSH_NEW_CAPTURES = 0x60, // operand: stringPool index (production routing key) → push {} with __production: key
  PUSH_LITERAL_FIELD = 0x61, // operand: stringPool field name, stringPool value → captures[name] = value (constant)
  PUSH_NUMBER_FIELD = 0x62, // operand: stringPool field name, numberPool index → captures[name] = number
  PUSH_BOOL_FIELD = 0x63,   // operand: stringPool field name, u8 bool → captures[name] = bool

  // Render dispatch (for stringify and inverse — Task 6.5)
  RENDER_DISPATCH = 0x70,   // operand: target index → dispatch the top-of-stack captures through __dispatchRender_<target>
  STRINGIFY_DISPATCH = 0x71, // operand: target index → ditto for stringify
}

// Bytes per operand (fixed-width for now; ULEB128 in a follow-up if size is tight).
export const OPERAND_SIZES: Readonly<Record<Op, ReadonlyArray<number>>> = {
  // ... (one entry per opcode, e.g. CONSUME_LITERAL: [4] for stringPool index)
};
```

The implementer fills in the OPERAND_SIZES table during this step. Refer to the encoder (Step 5) for what each opcode actually needs.

- [ ] **Step 4: Define the encoder output shape.** In `packages/compiler/src/emit/bytecode/encoder.ts`:

```ts
import type { InferredSchema, NodeTypeInfo, Production } from '../../model.ts';
import { Op } from './ops.ts';

export type EncodedSchema = {
  readonly ops: Uint8Array;                      // contiguous opcode + operand stream
  readonly stringPool: ReadonlyArray<string>;    // dedup'd string constants (literals, capture names, target names)
  readonly numberPool: ReadonlyArray<number>;    // dedup'd number constants
  readonly productionOffsets: ReadonlyMap<string, number>; // 'NodeType#N' → offset into ops
  readonly rootProductionKey: string;
};

export function encodeSchema(schema: InferredSchema): EncodedSchema {
  // ... walk schema.nodeTypes, emit per-production opcode block, append to ops Uint8Array
}
```

- [ ] **Step 5: Implement encoder for cron's primitives.** Cron uses:
  - Literal spans (`*`, `/`, `-`, ` `)
  - Number spans with `.int()` refinement
  - Ident spans with `.css()` refinement
  - Recursive `.repeats({ min: 1 })` spans
  - Multi-production node types (`CronField` has 4 productions)

  Encode walk per production:
  1. Mark `productionOffsets.set('<NodeType>#<idx>', ops.byteLength)`.
  2. Emit `SAVE_OFF entryOffSlot`.
  3. Emit `SKIP_WS`.
  4. For each span: emit the appropriate opcode(s) (CONSUME_LITERAL for literals, SCAN_CLASS for class spans, etc.). For recursive spans, emit `CALL_PRODUCTION childOffset`.
  5. Emit captures construction: `PUSH_NEW_CAPTURES <prodKey>` then `PUSH_*_FIELD` / `CAPTURE_SLICE` per body field.
  6. Emit `RETURN_OK`.

  The encoder is a single pass — productions are emitted in declaration order; forward references (a production calls another by name) are resolved via a fixup pass at the end (record the call site's operand byte-offset, then patch `productionOffsets.get(targetKey)` into it after all productions are written).

- [ ] **Step 6: Skeleton runtime stub.** Create `packages/compiler/src/emit/bytecode/runtime.ts` with a TYPE-ONLY skeleton (no implementation yet — Task 6.3 fills it in):

```ts
// Bytecode runtime (Task 6.3 fills this in). Type-only skeleton for now.
export type RuntimeState = {
  readonly input: string;
  readonly ops: Uint8Array;
  readonly stringPool: ReadonlyArray<string>;
  readonly numberPool: ReadonlyArray<number>;
  off: number;
  pc: number;
  maxOff: number;
  valueStack: unknown[];
};

export function runParse(_state: RuntimeState, _startOffset: number): unknown {
  throw new Error('bytecode runtime: not yet implemented (Task 6.3)');
}
```

- [ ] **Step 7: Backend registration skeleton.** Create `packages/compiler/src/emit/bytecode/index.ts`:

```ts
import type { Backend } from '../backend.ts';
import type { InferredSchema } from '../../model.ts';
import { encodeSchema } from './encoder.ts';

export const BYTECODE_BACKEND: Backend = {
  name: 'bytecode',
  fileExtension: '.bcode.ts',
  emit(schema: InferredSchema): string {
    const encoded = encodeSchema(schema);
    // Task 6.6 turns this into a real emit. For now, emit a stub TS file
    // that imports the runtime and exposes parse/render/stringify.
    return `// Bytecode-backend stub for ${schema.rootType} — Task 6.6 will flesh this out.\nexport {};\n`;
  },
};
```

- [ ] **Step 8: Run the encoder test.**

```bash
npx tsx --test packages/compiler/test/bytecode-encoder.test.ts 2>&1 | grep -E "ok|not ok"
```

Expected: passes (ops is non-empty Uint8Array, stringPool/productionOffsets populated).

- [ ] **Step 9: Commit.**

```bash
git add packages/compiler/src/emit/bytecode/ \
        packages/compiler/test/bytecode-encoder.test.ts
git commit -m "feat(compiler): bytecode encoder for cron primitives (Task 6.2)"
```

---

## Task 6.3: Bytecode runtime interpreter — parse path

**Why:** the runtime executes the opcode stream produced by the encoder. Task 6.3 implements enough opcodes to run cron's parse path correctly.

**Files:**
- Modify: `packages/compiler/src/emit/bytecode/runtime.ts`
- Test: `packages/compiler/test/bytecode-runtime.test.ts`

- [ ] **Step 1: Failing test.** Create `packages/compiler/test/bytecode-runtime.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { encodeSchema } from '../src/emit/bytecode/encoder.ts';
import { runParse } from '../src/emit/bytecode/runtime.ts';
import { inferSchema } from '../src/index.ts';

test('bytecode runtime: parse cron "* * * * * date"', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = inferSchema(raw);
  const encoded = encodeSchema(schema);
  const state = {
    input: '* * * * * date',
    ops: encoded.ops,
    stringPool: encoded.stringPool,
    numberPool: encoded.numberPool,
    off: 0,
    pc: 0,
    maxOff: 0,
    valueStack: [],
  };
  const rootOffset = encoded.productionOffsets.get(encoded.rootProductionKey)!;
  const captures = runParse(state, rootOffset);
  assert.ok(captures !== null, 'parse must return captures, not null');
  assert.equal((captures as any).__production, encoded.rootProductionKey);
});
```

- [ ] **Step 2: Run, expect failure.** Throws "not yet implemented".

- [ ] **Step 3: Implement the interpreter.** Replace `runParse`'s stub with a switch-on-opcode loop:

```ts
export function runParse(state: RuntimeState, startOffset: number): unknown {
  state.pc = startOffset;
  while (true) {
    const op = state.ops[state.pc++]!;
    switch (op) {
      case Op.CONSUME_LITERAL: {
        const idx = readU32(state);
        const lit = state.stringPool[idx]!;
        if (!state.input.startsWith(lit, state.off)) return null;
        state.off += lit.length;
        break;
      }
      case Op.SKIP_WS: {
        while (state.off < state.input.length) {
          const c = state.input.charCodeAt(state.off);
          if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { state.off++; continue; }
          break;
        }
        break;
      }
      // ... one case per Op in scope for cron
      case Op.RETURN_OK: {
        return state.valueStack.pop();
      }
      case Op.RETURN_NULL: {
        // Restore entry offset; cleanup happens at the caller.
        return null;
      }
      default:
        throw new Error(`bytecode runtime: unknown opcode 0x${op.toString(16)} at pc=${state.pc - 1}`);
    }
  }
}

function readU32(state: RuntimeState): number {
  const v = (state.ops[state.pc]! << 24) | (state.ops[state.pc + 1]! << 16) | (state.ops[state.pc + 2]! << 8) | state.ops[state.pc + 3]!;
  state.pc += 4;
  return v >>> 0;
}
```

Implement every opcode the encoder emitted in Task 6.2 for cron.

- [ ] **Step 4: Run the runtime test.**

```bash
npx tsx --test packages/compiler/test/bytecode-runtime.test.ts 2>&1 | grep -E "ok|not ok"
```

Expected: passes. If it doesn't, the bug is either (a) encoder produced wrong opcodes or (b) runtime executes them wrong. Iterate.

- [ ] **Step 5: Commit.**

```bash
git add packages/compiler/src/emit/bytecode/runtime.ts \
        packages/compiler/test/bytecode-runtime.test.ts
git commit -m "feat(compiler): bytecode runtime parses cron input (Task 6.3)"
```

---

## Task 6.4: Bytecode render dispatch + inverse stringify

**Why:** Task 6.3 parses; Task 6.4 adds the render (captures → target) and inverse (target → source) paths. The renderer is structurally simpler than parsing — it walks the captures tree and concatenates strings or builds objects per the target's RenderBody.

**Files:**
- Modify: `packages/compiler/src/emit/bytecode/encoder.ts` — emit RENDER_DISPATCH / STRINGIFY_DISPATCH opcodes per production × target
- Modify: `packages/compiler/src/emit/bytecode/runtime.ts` — implement render + stringify
- Test: extend `packages/compiler/test/bytecode-runtime.test.ts`

- [ ] **Step 1: Failing test additions.**

```ts
test('bytecode runtime: render cron captures to source', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = inferSchema(raw);
  const encoded = encodeSchema(schema);
  const state = makeState('* * * * * date', encoded);
  const rootOffset = encoded.productionOffsets.get(encoded.rootProductionKey)!;
  const captures = runParse(state, rootOffset);
  const source = runRender(encoded, captures, 'source');
  assert.equal(source, '* * * * * date');
});

test('bytecode runtime: stringify cron ast back to source', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = inferSchema(raw);
  const encoded = encodeSchema(schema);
  const ast = { type: 'cron', minute: { type: 'wildcard' }, /* ... */ };
  const source = runStringify(encoded, ast, 'source');
  assert.match(source, /^\* /);
});
```

- [ ] **Step 2: Encode render bodies.** For each (production, target) pair, emit a separate opcode block that:
  - Reads the captures stack frame
  - Walks the body (template/object/array/scalar/ref)
  - Pushes the rendered value onto the value stack
  - Returns

  Record the offset in a `renderOffsets: Map<'<NodeType>#<idx>:<target>', number>` map on `EncodedSchema`.

- [ ] **Step 3: Encode inverse bodies.** Same as Step 2 but mirrors `infer/invert.ts:InverseIR` — walk the inverse-derived IR, populate captures from the rendered value, then dispatch to the production's rebuild subroutine. Inverse rebuild itself needs encoding too (mirror `emit/rebuild.ts`).

- [ ] **Step 4: Implement `runRender` and `runStringify` in runtime.ts.**

- [ ] **Step 5: Add render/stringify dispatcher entry points.** The encoded schema needs root-level dispatchers (mirroring `__dispatchRender_<target>` and `__dispatchInverse_<target>` in the TS backend). Each is an opcode block that switches on `captures.__production` (for render) or value shape (for stringify) and jumps to the matching production+target block.

- [ ] **Step 6: Run tests.** Expected: render + stringify tests pass.

- [ ] **Step 7: Commit.**

```bash
git add packages/compiler/src/emit/bytecode/ \
        packages/compiler/test/bytecode-runtime.test.ts
git commit -m "feat(compiler): bytecode render + stringify dispatch (Task 6.4)"
```

---

## Task 6.5: Bytecode-backend file emit + integration

**Why:** Tasks 6.2–6.4 build the encoder + runtime. Task 6.5 makes the bytecode backend produce a usable `.bcode.ts` file that cron's package can import and use exactly like the existing TS-backend `parser.ts`.

**Decision required at the start of this task:** inline base64 vs separate `.bcode` file. Recommendation: **inline base64** for first slice — keeps the generated artifact single-file and identical-shaped to the TS backend's output.

**Files:**
- Modify: `packages/compiler/src/emit/bytecode/index.ts` — flesh out `BYTECODE_BACKEND.emit`
- Modify: `packages/compiler/src/emit/bytecode/runtime.ts` — export public API (`__parse`, `render`, `stringify`, `validate`) shape-compatible with the TS backend's emitted parser
- Test: `packages/compiler/test/bytecode-roundtrip.test.ts` — full lifecycle on cron

- [ ] **Step 1: Failing test.** Create `packages/compiler/test/bytecode-roundtrip.test.ts`:

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inferSchema } from '../src/index.ts';
import { BYTECODE_BACKEND } from '../src/emit/bytecode/index.ts';

test('bytecode backend: cron emits a runnable parser', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = inferSchema(raw);
  const source = BYTECODE_BACKEND.emit(schema);
  // Write to a temp file and dynamic-import
  const dir = mkdtempSync(join(tmpdir(), 'bcode-'));
  const file = join(dir, 'cron.bcode.ts');
  writeFileSync(file, source);
  try {
    const mod = await import(file);
    const captures = mod.__parse('* * * * * date');
    assert.equal(captures.__production, 'Cron#0');
    const rendered = mod.render('* * * * * date', { type: 'source' });
    assert.equal(rendered, '* * * * * date');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Implement file emit.** The emitter produces a `.ts` file with:

```ts
// Generated by @parser2/compiler bytecode backend.
import { decodeSchema, makeState, runParse, runRender, runStringify } from '@parser2/compiler/bytecode/runtime';

const __BYTECODE_B64 = "<base64-encoded ops + pools>";
const __DECODED = decodeSchema(__BYTECODE_B64);

export function __parse(input: string): unknown {
  const state = makeState(input, __DECODED);
  const captures = runParse(state, __DECODED.rootProductionOffset);
  if (captures === null || state.pos !== input.length) throw syntaxErrorAt(input, state.maxOff);
  return captures;
}

export function render(input: string, options?: { type?: string }): unknown {
  const target = options?.type ?? __DECODED.defaultTarget;
  if (!target) throw new Error("render: missing target");
  const captures = __parse(input);
  return runRender(__DECODED, captures, target);
}

export function stringify(value: unknown, options?: { type?: string }): string {
  const target = options?.type ?? __DECODED.defaultTarget;
  if (!target) throw new Error("stringify: missing target");
  return runStringify(__DECODED, value, target);
}
```

The `decodeSchema(base64): DecodedSchema` helper lives in runtime.ts and parses the base64 string into the same `EncodedSchema` shape the encoder produced.

- [ ] **Step 3: Make `@parser2/compiler/bytecode/runtime` resolvable.** Add a `package.json` `exports` entry on the compiler package OR adjust the import path in the emitted file to be a relative path into `node_modules/@parser2/compiler/dist/emit/bytecode/runtime.js`. **Recommendation:** export the runtime as part of `@parser2/compiler`'s `exports` map — simplest for downstream consumers.

- [ ] **Step 4: Run the roundtrip test.**

```bash
npx tsx --test packages/compiler/test/bytecode-roundtrip.test.ts 2>&1 | tail -20
```

Expected: passes.

- [ ] **Step 5: Commit.**

```bash
git add packages/compiler/src/emit/bytecode/ \
        packages/compiler/package.json \
        packages/compiler/test/bytecode-roundtrip.test.ts
git commit -m "feat(compiler): bytecode backend emits runnable parser file (Task 6.5)"
```

---

## Task 6.6: Generate cron via bytecode backend + verify equivalence

**Why:** demonstrate the exit gate — cron works identically under TS and bytecode backends.

**Files:**
- Add: `packages/cron/src/_generated/parser.bcode.ts` (generated)
- Possibly modify: `packages/cron/package.json` — add a `generate:bcode` script
- Test: `packages/cron/test/bytecode-equivalence.test.ts`

- [ ] **Step 1: Failing equivalence test.**

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import * as tsBackend from '../src/_generated/parser.ts';
import * as bcodeBackend from '../src/_generated/parser.bcode.ts';

const EXAMPLES = [
  '* * * * * date',
  '0 9 * * 1-5 npm test',
  '*/5 * * * * health-check',
  // ... use cron's test fixtures
];

for (const input of EXAMPLES) {
  test(`bytecode equivalence: cron "${input}"`, () => {
    const tsCaptures = tsBackend.__parse(input);
    const bcCaptures = bcodeBackend.__parse(input);
    assert.deepStrictEqual(stripSource(bcCaptures), stripSource(tsCaptures));
    const tsSource = tsBackend.render(input, { type: 'source' });
    const bcSource = bcodeBackend.render(input, { type: 'source' });
    assert.equal(bcSource, tsSource);
    const tsAst = tsBackend.render(input, { type: 'ast' });
    const bcAst = bcodeBackend.render(input, { type: 'ast' });
    assert.deepStrictEqual(stripSource(bcAst), stripSource(tsAst));
    // Stringify round-trip
    assert.equal(bcodeBackend.stringify(tsAst, { type: 'source' }), input);
  });
}
```

- [ ] **Step 2: Add generate scripts to cron.** In `packages/cron/package.json`:

```json
{
  "scripts": {
    "generate": "npm run generate:ts && npm run generate:bcode",
    "generate:ts": "tsx ../../packages/compiler/src/cli.ts src/schema.ts --backend ts",
    "generate:bcode": "tsx ../../packages/compiler/src/cli.ts src/schema.ts --backend bytecode"
  }
}
```

- [ ] **Step 3: Generate both backends.**

```bash
npm run generate -w @parser2/cron
ls -la packages/cron/src/_generated/
```

Expected: both `parser.ts` and `parser.bcode.ts` exist.

- [ ] **Step 4: Run the equivalence test.**

```bash
npm run test -w @parser2/cron 2>&1 | grep -E "^# (tests|pass|fail)"
```

Expected: cron 9 + N equivalence tests pass.

- [ ] **Step 5: Commit.**

```bash
git add packages/cron/ \
        packages/cron/test/bytecode-equivalence.test.ts
git commit -m "feat(cron): bytecode backend generates equivalent parser (Task 6.6)"
```

---

## Task 6.7: Budget verification

**Why:** the master plan's Phase 6 exit gate has two hard budgets: bytecode runtime + opcode stream ≤ 50 KB, and bytecode throughput within 2× of TS backend.

**Files:**
- Add: `packages/compiler/test/bytecode-budget.test.ts`
- Possibly modify: `packages/compiler/src/emit/bytecode/encoder.ts` (if size budget fails — opcode tightening, ULEB128 operands)
- Possibly modify: `packages/compiler/src/emit/bytecode/runtime.ts` (if perf budget fails — hot-loop tuning)

- [ ] **Step 1: Size measurement test.**

```ts
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

test('bytecode budget: cron runtime + opcode stream ≤ 50 KB', async () => {
  const generated = readFileSync('packages/cron/src/_generated/parser.bcode.ts', 'utf8');
  const runtime = readFileSync('packages/compiler/src/emit/bytecode/runtime.ts', 'utf8');
  const totalBytes = Buffer.byteLength(generated) + Buffer.byteLength(runtime);
  assert.ok(totalBytes <= 50 * 1024,
    `bytecode size budget exceeded: ${totalBytes} bytes (budget 50 KB / ${50 * 1024} bytes)`);
});
```

- [ ] **Step 2: Perf bench test.** Bench 1000 parses of a representative input, compare TS vs bytecode wall time:

```ts
test('bytecode budget: cron throughput within 2× of TS', async () => {
  const tsBackend = await import('../../cron/src/_generated/parser.ts');
  const bcBackend = await import('../../cron/src/_generated/parser.bcode.ts');
  const input = '*/5 9-17 * * 1-5 npm run check && npm test';
  const N = 1000;
  const tsStart = performance.now();
  for (let i = 0; i < N; i++) tsBackend.__parse(input);
  const tsMs = performance.now() - tsStart;
  const bcStart = performance.now();
  for (let i = 0; i < N; i++) bcBackend.__parse(input);
  const bcMs = performance.now() - bcStart;
  assert.ok(bcMs <= tsMs * 2,
    `bytecode throughput budget exceeded: bc=${bcMs.toFixed(2)}ms vs ts=${tsMs.toFixed(2)}ms (budget 2×)`);
});
```

- [ ] **Step 3: If size fails:** tighten the encoder. Common levers: ULEB128 for indices (small ints fit in 1 byte instead of 4), dedupe identical opcode sequences, use single-byte pool indices when pool < 256 entries.

- [ ] **Step 4: If perf fails:** profile the runtime hot loop. Common levers: hoist `state.ops.byteLength` outside the loop; replace switch with a jump table (array of function refs); inline single-use opcodes.

- [ ] **Step 5: Commit.**

```bash
git add packages/compiler/test/bytecode-budget.test.ts
git commit -m "test(v2): bytecode size + perf budget verification (Task 6.7)"
```

---

## Task 6.8: Documentation closeout

- [ ] **Step 1: Update `docs/v2-migration-status.md`** with the Phase 6 closeout — what landed, exit gate verified, known follow-ups (bytecode fusion path, raws mode in bytecode, other schemas opted into bytecode).
- [ ] **Step 2: Update `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md`** marking Phase 6 tasks 6.1–6.8 complete with their commit SHAs.
- [ ] **Step 3: Update `AGENTS.md`** if backend-pluggability changes any non-negotiable invariant (e.g. the "TS-only codegen" assumption is now historical).
- [ ] **Step 4: Commit.**

```bash
git add docs/v2-migration-status.md \
        docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md \
        AGENTS.md
git commit -m "docs: Phase 6 bytecode-backend closeout"
```

---

## Exit gate (verified before declaring Phase 6 complete)

1. All 5 in-scope package suites stay green (parser, compiler, css, html, markdown).
2. cron passes both `parser.ts` and `parser.bcode.ts` paths with full lifecycle equivalence (parse/render/stringify round-trips identical).
3. Bytecode size budget: runtime + opcode stream ≤ 50 KB for cron.
4. Bytecode perf budget: throughput within 2× of TS backend on a representative cron input.
5. `--backend ts|bytecode` CLI flag selects between backends.

## Known follow-ups (deferrable)

- **Bytecode fusion path.** Phase 5 fusion lives only in the TS backend. The bytecode runtime uses the captures-based render path. Adding fusion to bytecode would require new opcodes (FUSED_PUSH, FUSED_DISPATCH) and the encoder side of Phase 5's recursive role-ladder.
- **Bytecode raws mode.** Schemas needing `mode: 'raws'` (source-position metadata) currently fall back to the TS backend. Bytecode raws would need additional opcodes for offset capture + line-start computation.
- **Other schemas opted into bytecode.** Phase 6 demos on cron. css/html/markdown stay on TS by default. Opting them in requires no plan change — just `npm run generate -- --backend bytecode` and ensuring the equivalence tests pass.
- **Backend dispatch test parity.** The current Phase 5 `fusion-round-trip.test.ts` exercises the TS backend's fused path. Add a parallel `bytecode-roundtrip-fixtures.test.ts` iterating cron's full example set if confidence requires.
