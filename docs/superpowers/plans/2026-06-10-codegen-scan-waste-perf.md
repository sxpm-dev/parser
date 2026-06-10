# Generic Codegen Scan-Waste Elimination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate redundant text scanning in the v2 TS-backend speculative dispatch (the same bytes are scanned up to 3× per node today), as pure domainless compiler codegen, benchmarked via `packages/css`.

**Architecture:** Two generic optimizations on the structured-fusion dispatch path in `packages/compiler/src/emit/v2/`: (1) *until-divergence factoring* — sibling productions of one node type that differ only by one extra until-stop char plus a literal tail share a single scan; (2) *until-viability guard* — a production whose until-led first span must terminate at a specific literal char to succeed gets a cheap captureless pre-scan that skips the full attempt when that char cannot be the terminator. Plus one micro-fix (lazy comment-list allocation) and a profile-gated raws-mode investigation.

**Tech Stack:** TypeScript compiler emitters (`packages/compiler`), node:test, tsx, existing bench/perf-gate infra.

**Spec:** `docs/superpowers/specs/2026-06-10-codegen-perf-dx-design.md`

---

## Measured context (2026-06-10, drives every task)

Baseline measurement protocol (used throughout; run from `packages/css`):

```bash
cat > /tmp/css-prof.mjs <<'EOF'
const { render } = await import('/Users/valerii/Develop/parser3_codex/packages/css/src/_generated/parser.ts');
const { generateCss } = await import('/Users/valerii/Develop/parser3_codex/packages/css/bench/common.ts');
const input = generateCss(500*1024);
let t0 = performance.now();
while (performance.now()-t0 < 2000) render(input,{target:'ast',mode:'fast'});
const trials = [];
for (let t=0;t<5;t++){
  let n=0; const s=performance.now();
  while (performance.now()-s < 1000) { render(input,{target:'ast',mode:'fast'}); n++; }
  trials.push((performance.now()-s)/n);
}
trials.sort((a,b)=>a-b);
console.log('trials ms/iter:', trials.map(x=>x.toFixed(2)).join(' '), '| median', trials[2].toFixed(2), '| MB/s', (input.length/1048576/(trials[2]/1000)).toFixed(1));
EOF
npx tsx /tmp/css-prof.mjs
```

Baseline: **median ~10.5 ms/iter (~47 MB/s)** on 500KB synthetic CSS.

Call-count instrumentation (proves where the waste is; re-run after Tasks 2 & 3):

```bash
cat > /tmp/css-count.mjs <<'EOF'
import fs from 'node:fs';
let src = fs.readFileSync('/Users/valerii/Develop/parser3_codex/packages/css/src/_generated/parser.ts','utf8');
src = src.replace('// @ts-nocheck', "// @ts-nocheck\nglobalThis.__CNT = {};\nconst __cnt = (k) => { globalThis.__CNT[k] = (globalThis.__CNT[k]||0)+1; };");
src = src.replace(/function (__fusedRenderStructured_[A-Za-z]+_[0-9]+_ast)\(state: State\): unknown \{/g,
  (m, name) => m + ` __cnt('${name}');`);
fs.writeFileSync('/tmp/parser-counted.ts', src);
const { render } = await import('/tmp/parser-counted.ts');
const { generateCss } = await import('/Users/valerii/Develop/parser3_codex/packages/css/bench/common.ts');
const input = generateCss(500*1024);
const ast = render(input,{target:'ast',mode:'fast'});
const count = (n) => { let c=0; const w=(x)=>{ if(x&&typeof x==='object'){ if(x.type===n)c++; (x.nodes||[]).forEach(w);} }; w(ast); return c; };
console.log('AST: decls', count('decl'), 'rules', count('rule'), 'atrules', count('atrule'), 'comments', count('comment'));
console.log(globalThis.__CNT);
EOF
npx tsx /tmp/css-count.mjs
```

Baseline counts (500KB synthetic; 12,178 decls / 4,059 rules / 2,030 atrules):

| fused fn | calls | waste |
|---|---|---|
| `Rule_0_ast` | 22,326 | 18,267 failed full selector scans (one per declaration) |
| `Declaration_0_ast` (!important alt) | 18,267 | all fail — full `prop:value` scan each |
| `Declaration_1_ast` (plain alt) | 18,267 | 12,178 succeed; 6,089 cheap loop-exit probes |

Findings that **amend the spec**:
- Spec P1.1 (hoist `__KB` tables) is **dead**: measured neutral (10.46 vs 10.86 ms/iter median, within noise. V8's COW boilerplate already makes the per-call literal cheap). Do not implement.
- Spec P1.2 (FIRST-set dispatch) **already exists** (`emitFusedStructuredRoleDispatch` in `fusion-structured.ts` emits the `/`→Comment, `@`→AtRule gate; `computeRoleFirstBytes` in `role-ladder.ts`). Do not implement.
- Spec P1.3 and a lightweight form of P2 are promoted to the top, justified by the counter data above.

## Scope notes for the implementing engineer

- **Domainless rule (hard requirement):** nothing in `packages/compiler` may mention CSS or any language. All detection is on `ResolvedSpan` structure (`packages/compiler/src/model.ts:26`, `SpanModifier` union in `packages/parser/src/types.ts:76`). CSS terms in this plan describe the *benchmark*, never the *trigger*.
- These optimizations apply to the **structured-fusion path** (`emit/v2/fusion-structured.ts` + dispatcher generation in `emit/v2/index.ts:274-287`), which serves `target:'ast'` fast mode — the dominant bench path. The captures path keeps its existing speculation chain (raws mode is Task 6's separate investigation).
- `packages/css/src/_generated/*` is regenerated output — never hand-edit it in a commit (hand-edits are fine for throwaway measurements).
- Regen command: `cd packages/css && npm run generate:ts`. Full css tests: `npm test` (in packages/css). Compiler tests: `cd packages/compiler && npm test`.
- After EVERY emitter change, regen + test the other parser packages too (Task 5 has the sweep; quick check during development: `cd packages/html && npm run generate:ts && npm test`, same for `markdown`, `json`).

---

### Task 1: `detectUntilDivergence` — detection module + unit tests

Detects the sibling-production shape where a single scan can serve two alternatives.

**Generic shape:** node type with exactly 2 productions A (declared first) and B where:
- spans `0..i-1` are byte-identical (`spansMatchExactly`),
- span `i` of both is a **named, non-recursive** span with an `until` modifier, identical in `name`/`class`/refinements/other modifiers, where `stops(A) = stops(B) ∪ {x}` for exactly one single-char stop `x` not in `stops(B)`, both `balanced`, neither has `requireStop`,
- A's span `i+1` is a plain literal with text `x` (no modifiers, no recursive roles).

A's tail = spans `i+1..`; B's tail = spans `i+1..` of B.

**Files:**
- Create: `packages/compiler/src/emit/v2/detect-until-divergence.ts`
- Test: `packages/compiler/test/until-divergence.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/compiler/test/until-divergence.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';
import type { NodeTypeInfo, Production, ResolvedSpan } from '../src/model.ts';
import { detectUntilDivergence } from '../src/emit/v2/detect-until-divergence.ts';

function lit(text: string): ResolvedSpan {
  return { class: 'literal', text, refinements: [], modifiers: [], recursiveRoles: [] };
}
function untilSpan(name: string, stops: string[], extra: Partial<{ rejectSuffix: string[]; nonEmpty: boolean; requireStop: boolean }> = {}): ResolvedSpan {
  return {
    name, class: 'literal', text: name, refinements: [],
    modifiers: [{ kind: 'until', stops, balanced: true, trim: true, ...extra }],
    recursiveRoles: [],
  };
}
function identSpan(name: string): ResolvedSpan {
  return { name, class: 'ident', text: name, refinements: [{ name: 'css', args: [] }], modifiers: [], recursiveRoles: [] };
}
function optLit(text: string): ResolvedSpan {
  return { class: 'literal', text, refinements: [], modifiers: [{ kind: 'optional' }], recursiveRoles: [] };
}
function prod(spans: ResolvedSpan[]): Production {
  return { nodeType: 'X', source: { input: '' } as Production['source'], spans, renders: new Map() };
}

// The declaration-like pair: A = p until[:;}] ':' v until[;}!] '!' kw ';'? ; B = p until[:;}] ':' v until[;}] ';'?
function declPair(): NodeTypeInfo {
  return {
    name: 'X',
    productions: [
      prod([untilSpan('p', [':', ';', '}']), lit(':'), untilSpan('v', [';', '}', '!']), lit('!'), identSpan('kw'), optLit(';')]),
      prod([untilSpan('p', [':', ';', '}']), lit(':'), untilSpan('v', [';', '}']), optLit(';')]),
    ],
  };
}

test('detects the until-divergence pair shape', () => {
  const d = detectUntilDivergence(declPair());
  assert.ok(d);
  assert.equal(d.scanIdx, 2);
  assert.equal(d.extraStop, '!');
  assert.equal(d.longAltIdx, 0);
  assert.equal(d.shortAltIdx, 1);
});

test('detects when the long alt is declared second', () => {
  const info = declPair();
  info.productions = [info.productions[1]!, info.productions[0]!];
  const d = detectUntilDivergence(info);
  assert.ok(d);
  assert.equal(d.longAltIdx, 1);
  assert.equal(d.shortAltIdx, 0);
});

test('returns null when stop sets differ by more than one char', () => {
  const info = declPair();
  // long alt has two extra stops
  (info.productions[0]!.spans[2]!.modifiers[0] as { stops: string[] }).stops = [';', '}', '!', '?'];
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null when the extra stop is multi-char', () => {
  const info = declPair();
  (info.productions[0]!.spans[2]!.modifiers[0] as { stops: string[] }).stops = [';', '}', '!!'];
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null when the long alt does not follow with literal(extraStop)', () => {
  const info = declPair();
  info.productions[0]!.spans[3] = lit('?'); // literal text != extra stop
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null when the follow literal is optional', () => {
  const info = declPair();
  info.productions[0]!.spans[3] = optLit('!');
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null when the diverging spans disagree on rejectSuffix', () => {
  const info = declPair();
  info.productions[1]!.spans[2] = untilSpan('v', [';', '}'], { rejectSuffix: [':'] });
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null when either until has requireStop', () => {
  const info = declPair();
  info.productions[0]!.spans[2] = untilSpan('v', [';', '}', '!'], { requireStop: true });
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null when shared prefix differs', () => {
  const info = declPair();
  info.productions[1]!.spans[0] = untilSpan('p', [':', ';']); // different stop set in prefix
  assert.equal(detectUntilDivergence(info), null);
});

test('returns null for 1 or 3+ productions', () => {
  const one: NodeTypeInfo = { name: 'X', productions: [declPair().productions[0]!] };
  assert.equal(detectUntilDivergence(one), null);
  const three = declPair();
  three.productions = [...three.productions, prod([lit('z')])];
  assert.equal(detectUntilDivergence(three), null);
});

test('returns null when the diverging span is recursive', () => {
  const info = declPair();
  info.productions[0]!.spans[2] = { ...untilSpan('v', [';', '}', '!']), recursiveRoles: ['Y'] };
  assert.equal(detectUntilDivergence(info), null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/compiler && npx tsx --test test/until-divergence.test.ts`
Expected: FAIL — cannot find module `detect-until-divergence.ts`.

- [ ] **Step 3: Implement the detection module**

```typescript
// packages/compiler/src/emit/v2/detect-until-divergence.ts
//
// Generic detection of the "until-divergence" sibling shape: two productions
// of one node type that are identical except production A's until-scan at
// span i carries ONE extra single-char stop x, and A's next span is a plain
// literal(x). Under the speculation chain, every input that matches B pays a
// full failed parse of A first (A scans the capture, stops where B would,
// then fails the literal(x) check). The merged emitter (Task 2) runs ONE
// scan with A's stop set: stopping at x routes to A's tail, anything else
// routes directly to B's tail with the already-captured value — the common
// case never scans twice.
//
// Domainless: triggered purely by ResolvedSpan structure. Any schema with
// a "value with optional bang-suffix tail" shape benefits (the css
// !important pair is one instance; so is e.g. an at-rule statement/block
// pair diverging on '{' if expressed this way).

import type { NodeTypeInfo, ResolvedSpan, SpanModifier } from '../../model.ts';
import { spansMatchExactly } from './shared-dispatch.ts';

export interface UntilDivergence {
  /** Index of the diverging until span (shared prefix is 0..scanIdx-1). */
  readonly scanIdx: number;
  /** The single-char stop present only in the long alt's scan. */
  readonly extraStop: string;
  /** Production index (in info.productions) of the long alt (has extraStop + literal tail). */
  readonly longAltIdx: number;
  /** Production index of the short alt. */
  readonly shortAltIdx: number;
}

type UntilMod = Extract<SpanModifier, { kind: 'until' }>;

function untilOf(span: ResolvedSpan): UntilMod | null {
  const m = span.modifiers.find((mm) => mm.kind === 'until');
  return (m as UntilMod | undefined) ?? null;
}

/** Spans equal ignoring the until modifier's stop list (everything else must match). */
function spansMatchExceptStops(a: ResolvedSpan, b: ResolvedSpan): boolean {
  const ua = untilOf(a);
  const ub = untilOf(b);
  if (!ua || !ub) return false;
  const strip = (s: ResolvedSpan, u: UntilMod): ResolvedSpan => ({
    ...s,
    modifiers: s.modifiers.map((m) => (m === u ? { ...u, stops: [] } : m)),
  });
  return spansMatchExactly(strip(a, ua), strip(b, ub));
}

export function detectUntilDivergence(info: NodeTypeInfo): UntilDivergence | null {
  if (info.productions.length !== 2) return null;
  const [p0, p1] = [info.productions[0]!, info.productions[1]!];

  for (const [long, short, longIdx, shortIdx] of [
    [p0, p1, 0, 1] as const,
    [p1, p0, 1, 0] as const,
  ]) {
    // Shared byte-identical prefix.
    let i = 0;
    while (
      i < long.spans.length &&
      i < short.spans.length &&
      spansMatchExactly(long.spans[i]!, short.spans[i]!)
    ) i++;

    const ls = long.spans[i];
    const ss = short.spans[i];
    if (!ls || !ss) continue;
    if (ls.recursiveRoles.length > 0 || ss.recursiveRoles.length > 0) continue;
    if (!ls.name || ls.name !== ss.name) continue;
    if (!spansMatchExceptStops(ls, ss)) continue;

    const ul = untilOf(ls)!;
    const us = untilOf(ss)!;
    if (ul.requireStop || us.requireStop) continue;
    if (!ul.balanced || !us.balanced) continue;

    const shortStops = new Set(us.stops);
    const extra = ul.stops.filter((s) => !shortStops.has(s));
    const missing = us.stops.filter((s) => !new Set(ul.stops).has(s));
    if (missing.length !== 0 || extra.length !== 1) continue;
    const x = extra[0]!;
    if (x.length !== 1) continue;

    // Long alt must continue with a plain literal(x).
    const follow = long.spans[i + 1];
    if (!follow) continue;
    if (follow.class !== 'literal' || follow.text !== x) continue;
    if (follow.modifiers.length > 0 || follow.recursiveRoles.length > 0) continue;

    return { scanIdx: i, extraStop: x, longAltIdx: longIdx, shortAltIdx: shortIdx };
  }
  return null;
}
```

Note: if `spansMatchExactly` is not exported from `shared-dispatch.ts` with a shape-tolerant comparison for this use, check its implementation first — `prefix-share-dispatch.ts:37` already imports it the same way, so it is exported and battle-tested for exactly this comparison.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/compiler && npx tsx --test test/until-divergence.test.ts`
Expected: all PASS. If `spansMatchExceptStops` fails on the stop-stripped clone (e.g. `spansMatchExactly` compares modifier object identity), adapt the strip to a deep-normalized comparison — the tests define the contract.

- [ ] **Step 5: Commit**

```bash
git add packages/compiler/src/emit/v2/detect-until-divergence.ts packages/compiler/test/until-divergence.test.ts
git commit -m "feat(compiler/v2): detect until-divergence sibling productions"
```

---

### Task 2: Merged emission for until-divergent siblings (structured-fusion dispatcher)

Replace the `r0/r1` speculation chain in the per-node structured dispatcher with a merged function when `detectUntilDivergence` fires.

**Files:**
- Modify: `packages/compiler/src/emit/v2/fusion-structured.ts` (new exported `emitFusedUntilDivergencePair`)
- Modify: `packages/compiler/src/emit/v2/index.ts:274-287` (dispatcher generation: use merged fn when detection fires and both alts are fusable)
- Test: `packages/compiler/test/until-divergence.test.ts` (extend with end-to-end behavioral tests)

**Generated-code contract** (the merged dispatcher body for the declaration-like pair; `state.pos` rewind + `maxOff` semantics identical to the existing per-production functions):

```
function __fusedRenderStructuredDispatch_X_ast(state) {
  // spans 0..scanIdx-1: emitted ONCE via emitSpan (long alt's spans — byte-identical to short's)
  // span scanIdx: emitted ONCE with the LONG stop set (S ∪ {x}); capture locals as usual.
  //   The scan loop already breaks at the stop char with `off` at the stop position.
  // After the scan:
  if (input.charCodeAt(off) === <x>) {
    const __save = off;            // also save per-capture locals the long tail may overwrite
    // ... long tail spans (literal x, then rest) via emitSpan; on ANY failure DO NOT
    //     `return null` — instead `off = __save; state.pos = entryOff;` and fall into the
    //     rescue below.
    // success: state.pos = off; return <long alt body>;
    // rescue: RE-SCAN span scanIdx from its start with the SHORT stop set
    //     (rare path: a depth-0 x existed but the long tail didn't match),
    //     then run the short tail and return <short alt body>.
  }
  // stop char was in the short set: the captured value is exactly what the
  // short alt's own scan would have produced (no depth-0 x was passed).
  // ... short tail spans via emitSpan; success → return <short alt body>; failure → return null.
}
```

Key correctness argument (include as a comment in the emitter): scanning with `S ∪ {x}` stops at the first depth-0 char of either set. If that char ∈ S, no depth-0 `x` occurred before it, so the capture is byte-identical to the short alt's own scan — routing to the short tail with zero rescan is exact. If it is `x`, the long alt is attempted; if its tail fails, the short alt's scan *would have continued past x*, so a rescan with stops S from the span start is required (rare path).

- [ ] **Step 1: Write the failing end-to-end tests** (append to `packages/compiler/test/until-divergence.test.ts`)

```typescript
import { $, defineSchema, literal as litB, parse, relation, span } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { emitV2 } from '../src/emit/v2/index.ts'; // adjust to the actual exported emit entry used by cli.ts
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// A schema-shaped (NOT css-named) divergent pair: Entry = "k : v [! kw] ;?"
function divergentSchema() {
  return defineSchema({
    rootType: 'Doc',
    punctuators: { colon: ':', semicolon: ';', bang: '!', lbrace: '{', rbrace: '}' },
    tokens: ['comment'],
    examples: [
      relation('Entry', {
        input: 'a: b !k;',
        encodings: {
          parse: parse([
            span('p', 'a').until([':', ';', '}']),
            litB(':'),
            span('v', 'b').until([';', '}', '!']),
            litB('!'),
            span('kw', 'k').ident().css(),
            litB(';').optional(),
          ]),
          ast: { type: 'entry', p: $.p, v: $.v, marked: true, kw: $.kw },
        },
      }),
      relation('Entry', {
        input: 'a: b;',
        encodings: {
          parse: parse([
            span('p', 'a').until([':', ';', '}']),
            litB(':'),
            span('v', 'b').until([';', '}']),
            litB(';').optional(),
          ]),
          ast: { type: 'entry', p: $.p, v: $.v },
        },
      }),
      relation('Doc', {
        input: 'a: b;',
        encodings: {
          parse: parse([
            span('nodes', 'a: b;').of('Entry').repeats({ min: 0, sep: ';', trailing: 'allowed' }),
          ]),
          ast: { type: 'doc', nodes: $.nodes },
        },
      }),
    ],
  });
}

async function compileToModule(schemaDef: ReturnType<typeof defineSchema>): Promise<{ render: (i: string, o: object) => unknown; source: string }> {
  const inferred = inferSchema(schemaDef);
  const source = emitV2(inferred); // adjust to actual signature (cli.ts shows the real call)
  const dir = mkdtempSync(join(tmpdir(), 'udiv-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, source);
  const mod = await import(file);
  return { render: mod.render, source };
}

test('merged dispatcher: plain entry parses identically and scans once', async () => {
  const { render, source } = await compileToModule(divergentSchema());
  assert.deepEqual(render('x: y;', { target: 'ast', mode: 'fast' }), {
    type: 'doc',
    nodes: [{ type: 'entry', p: 'x', v: 'y' }],
  });
  // Shape pin: dispatcher no longer emits the two-probe chain for Entry.
  assert.ok(!/const r0 = __fusedRenderStructured_Entry_0_ast/.test(source));
});

test('merged dispatcher: marked entry routes to long tail', async () => {
  const { render } = await compileToModule(divergentSchema());
  assert.deepEqual(render('x: y !k;', { target: 'ast', mode: 'fast' }), {
    type: 'doc',
    nodes: [{ type: 'entry', p: 'x', v: 'y', marked: true, kw: 'k' }],
  });
});

test('merged dispatcher rescue: depth-0 extra-stop whose tail fails falls back to short alt', async () => {
  const { render } = await compileToModule(divergentSchema());
  // '!' followed by a non-ident ⇒ long tail fails ⇒ short alt must capture '! ?' inside v.
  assert.deepEqual(render('x: y ! ?;', { target: 'ast', mode: 'fast' }), {
    type: 'doc',
    nodes: [{ type: 'entry', p: 'x', v: 'y ! ?' }],
  });
});

test('merged dispatcher: bracketed extra-stop is not a stop (balanced)', async () => {
  const { render } = await compileToModule(divergentSchema());
  assert.deepEqual(render('x: (a!b);', { target: 'ast', mode: 'fast' }), {
    type: 'doc',
    nodes: [{ type: 'entry', p: 'x', v: '(a!b)' }],
  });
});
```

Before writing these, open `packages/compiler/src/cli.ts` and copy the exact inference+emit call chain it uses for `--backend ts` (the `emitV2`/`inferSchema` names above are placeholders for whatever cli.ts actually calls — use the real names; everything else in the test stands as written). If an existing test (e.g. `fusion-round-trip.test.ts`) already has a compile-to-module helper, reuse it instead of `compileToModule`.

- [ ] **Step 2: Run new tests, verify the behavioral ones PASS (today's chain is correct, just slow) and the shape pin FAILS**

Run: `cd packages/compiler && npx tsx --test test/until-divergence.test.ts`
Expected: `scans once` test FAILS on the shape assertion (the r0-chain is still emitted); the pure-behavior tests PASS — they pin today's semantics so the merged emit can't change behavior.

- [ ] **Step 3: Implement `emitFusedUntilDivergencePair` in `fusion-structured.ts`**

Implementation guide (the emitter is line-based string building like `emitFusedRenderStructured` at `fusion-structured.ts:110`):

1. Signature: `emitFusedUntilDivergencePair(info: NodeTypeInfo, d: UntilDivergence, schema: InferredSchema, target: string): string | null`. Return null unless BOTH productions pass `canFuseStructured` (same gate the chain uses).
2. Build one `SpanContext` + `SpanBindings` per alt-body but share capture locals: emit prefix spans `0..scanIdx-1` from the long alt with `emitSpan` exactly as `emitFusedRenderStructured` does (including the `skipWsBlock()` interleave).
3. Emit the diverging span ONCE using the long alt's span (stop set `S ∪ {x}`) via `emitSpan`.
4. Emit `if (input.charCodeAt(off) === ${x.charCodeAt(0)}) { ... }` containing the long tail. **The long tail must not `return null` on failure** — `emitSpan` emits hard `return null` on span failure, so wrap the long tail in an IIFE-style labeled block: emit it into a separate generated helper function `__fusedRenderStructured_<Node>_long_<target>(state, <prefix capture params>)` that takes the prefix captures as parameters and returns the long body or null (this mirrors how `prefix-share-dispatch.ts` passes prefix captures to alt tails — read `emitPrefixShareDispatcher` there and follow its parameter-passing convention, including `__ws`/`__litPres` handling if present).
5. On long-helper null: emit the rescue rescan — a second `emitSpan` of the SHORT alt's diverging span (stops S) with `off` reset to a saved `__scanStart` local captured just before step 3's emit, then the short tail inline, then `return <short body>`.
6. After the `if` (stop ∉ {x}): short tail inline + `return <short body>`. Short-tail span failures keep their normal `return null` (dispatcher contract: null = no production matched; `state.pos` must be `entryOff` — `emitSpan`'s built-in failure code already does both).
7. Name the merged function `structuredRoleDispatcherName(node, target)` content — i.e. in `index.ts`, when detection fires and both alts fusable, emit the merged body INSTEAD of the probe chain inside the same dispatcher function name, so all callers are unaffected.

In `index.ts` (the loop at lines 274–287): before building `probes`, call `detectUntilDivergence(info)`; if non-null and both alt indices are in `fusableIdxs`, emit the merged dispatcher + the long-tail helper instead of the chain, and skip emitting the two per-production functions only if nothing else references them (the `__fusedRenderStructuredTable_` entries at `index.ts:214` may still reference per-production fns for the root table — keep emitting the per-production functions; dead ones are dropped by the bundler and harmless in the generated file).

- [ ] **Step 4: Run the full compiler test suite**

Run: `cd packages/compiler && npm test`
Expected: all PASS, including the new shape pin. Fix regressions before proceeding — `v2-regressions.test.ts` pins generated shapes and may need its goldens updated ONLY if the diff is the intended merged dispatcher.

- [ ] **Step 5: Regenerate CSS, run css tests, verify counters and bench**

```bash
cd packages/css && npm run generate:ts && npm test && npx tsx /tmp/css-count.mjs && npx tsx /tmp/css-prof.mjs
```

Expected:
- All css tests PASS (conformance + cases + round-trip are the semantic gate).
- Counters: `Declaration_0_ast`/`Declaration_1_ast` probe-chain calls replaced by merged-dispatcher behavior — the per-production fns may still exist but their call counts via the body-union path drop to ~0 (the count script matches fn entries; if the merged fn has a new name, add it to the regex and record its count ≈ 18,267 with no second-scan inside).
- Bench: median ms/iter improves vs 10.5 baseline. Record the number in the commit message.

- [ ] **Step 6: Quick cross-package check**

```bash
cd packages/html && npm run generate:ts && npm test
cd ../markdown && npm run generate:ts && npm test
cd ../json && npm run generate:ts && npm test
```
Expected: PASS everywhere (these schemas likely don't trigger the detection — the point is no collateral damage).

- [ ] **Step 7: Commit**

```bash
git add packages/compiler packages/css/src/_generated
git commit -m "feat(compiler/v2): until-divergence merged dispatch — single scan for sibling alts"
```

---

### Task 3: Until-viability guard for fallthrough roles in body unions

Kills the 18,267 failed full Rule attempts: a production whose until-led first span must terminate at literal char `L` to succeed can be guarded by a captureless pre-scan returning the actual depth-0 terminator; if it isn't `L`, skip the production without entering it.

**Generic trigger** (per role in `emitFusedStructuredRoleDispatch`'s fallthrough list, `fusion-structured.ts:316-422`): every production of the role has span 0 = named until-scan (balanced, non-recursive) and span 1 = plain single-char literal `L` with `L ∈ stops(span 0)`. (For the css schema: Rule = selector until `['{',';']` then literal `{` — qualifies. Declaration's span 1 is literal `:` with `:' ∈ stops` — also qualifies! Both get guards; Declaration's guard returns `:` for declarations, so both guards route correctly and the LAST fallthrough role keeps working even unguarded.)

**Guard semantics:** one shared helper per distinct (stop-set ∪ closers, machinery) signature:

```
function __untilTerminator_<hash>(input: string, off: number, len: number): number {
  // identical skip machinery to the until-scan (balanced depth, strings,
  // comments, url-raw if the schema's scan context includes them) but NO
  // captures, NO lastNonWs, NO comment list. Returns the charCode of the
  // first depth-0 stop char or unbalanced closer, or -1 at EOF.
}
```

Dispatcher integration (inside the existing fallthrough `probesFor` emission): for a guarded role, wrap its probe:

```
const __t = __untilTerminator_<hash>(input, off, len);
if (__t === <L charCode>) { __cand = __fusedRenderStructuredDispatch_Role_ast(state); }
```

For consecutive guarded roles sharing one stop-set signature (Rule + Declaration do NOT share — different stop sets — so each gets its own guard call; acceptable: guards are cheap), emit each guard before its probe. The final fallthrough role's probe stays unguarded **if** it is the last probe (preserves the "something must consume or we break the loop" semantics) — make this a rule: guard all but the last fallthrough probe.

**Correctness argument** (emit as comment): the until-scan for span 0 stops exactly at the first depth-0 occurrence of a char in its stop set or an unbalanced closer or EOF. The production then requires `literal(L)` at that position (whitespace-trim only moves the capture end, not the scan stop). So terminator ≠ L ⟹ the production cannot succeed; skipping it is exact. The guard's skip machinery must match the real scan's machinery — derive both from the same `SpanContext` flags (`tokens` has 'string'/'comment', url-raw eligibility, balanced) so they can't drift.

**Files:**
- Modify: `packages/compiler/src/emit/v2/fusion-structured.ts` (guard detection + emission in `emitFusedStructuredRoleDispatch`; helper emission hoisted to module level — thread a `helpers: Map<string,string>` sink through, or return helpers alongside the dispatch string and let `index.ts` collect them)
- Modify: `packages/compiler/src/emit/v2/index.ts` (collect + emit helper functions once)
- Test: `packages/compiler/test/until-viability-guard.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/compiler/test/until-viability-guard.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { $, defineSchema, literal as litB, parse, relation, span } from '@parser2/parser';
// reuse the same compile-to-module helper as until-divergence.test.ts (extract it
// into test/helpers/compile.ts when you get here — both tests need it)
import { compileToModule } from './helpers/compile.ts';

// Two until-led siblings in a union: Block = "sel { items }" vs Entry = "k : v".
function unionSchema() {
  return defineSchema({
    rootType: 'Doc',
    punctuators: { colon: ':', semicolon: ';', lbrace: '{', rbrace: '}' },
    tokens: ['comment'],
    examples: [
      relation('Block', {
        input: 's { k: v }',
        encodings: {
          parse: parse([
            span('sel', 's').until(['{', ';'], { nonEmpty: true }),
            litB('{'),
            span('nodes', 'k: v').of('Block', 'Entry').repeats({ sep: ';', trailing: 'allowed' }),
            litB('}'),
          ]),
          ast: { type: 'block', sel: $.sel, nodes: $.nodes },
        },
      }),
      relation('Entry', {
        input: 'k: v',
        encodings: {
          parse: parse([
            span('p', 'k').until([':', ';', '}']),
            litB(':'),
            span('v', 'v').until([';', '}']),
            litB(';').optional(),
          ]),
          ast: { type: 'entry', p: $.p, v: $.v },
        },
      }),
      relation('Doc', {
        input: 's { k: v }',
        encodings: {
          parse: parse([
            span('nodes', 's { k: v }').of('Block', 'Entry').repeats({ min: 0, sep: ';', trailing: 'allowed' }),
          ]),
          ast: { type: 'doc', nodes: $.nodes },
        },
      }),
    ],
  });
}

test('guard emits and routes entries directly to Entry (no Block attempt)', async () => {
  const { render, source } = await compileToModule(unionSchema());
  assert.ok(/__untilTerminator_/.test(source), 'guard helper should be emitted');
  assert.deepEqual(render('a: b; c { d: e }', { target: 'ast', mode: 'fast' }), {
    type: 'doc',
    nodes: [
      { type: 'entry', p: 'a', v: 'b' },
      { type: 'block', sel: 'c', nodes: [{ type: 'entry', p: 'd', v: 'e' }] },
    ],
  });
});

test('guard respects balanced brackets: braces inside parens are not terminators', async () => {
  const { render } = await compileToModule(unionSchema());
  // '(p{q})' — the '{' is bracketed, so Entry's value scan passes it; the
  // guard for Block must likewise not classify it as '{'-terminated... it
  // scans sel until ['{',';']: '(' opens depth, '{' inside is skipped, ')'
  // closes, then ':' is not a Block stop — scan continues to ';' ⇒ Block
  // skipped without a full parse.
  assert.deepEqual(render('a: (p{q});', { target: 'ast', mode: 'fast' }), {
    type: 'doc',
    nodes: [{ type: 'entry', p: 'a', v: '(p{q})' }],
  });
});

test('guard skips comments and strings like the real scan', async () => {
  const { render } = await compileToModule(unionSchema());
  assert.deepEqual(render('a /* { */ : "x{y";', { target: 'ast', mode: 'fast' }), {
    type: 'doc',
    nodes: [{ type: 'entry', p: 'a', v: '"x{y"' }],
  });
});
```

- [ ] **Step 2: Run, verify shape assertion fails** (behavior tests pass already)

Run: `cd packages/compiler && npx tsx --test test/until-viability-guard.test.ts`
Expected: FAIL only on `__untilTerminator_` presence.

- [ ] **Step 3: Implement guard detection, helper emission, dispatcher wrapping** (per the design block above; reuse the until-scan emitter's machinery branches from `span.ts:1302-1431` for the helper body — extract the shared skip-machinery emission into a function both call, e.g. `emitScanSkipArms(ctx, opts): string[]`, rather than duplicating the string/comment/url loops)

- [ ] **Step 4: Full compiler suite**

Run: `cd packages/compiler && npm test`
Expected: PASS (update `v2-regressions` goldens only for intended diffs).

- [ ] **Step 5: Regen css + tests + counters + bench**

```bash
cd packages/css && npm run generate:ts && npm test && npx tsx /tmp/css-count.mjs && npx tsx /tmp/css-prof.mjs
```

Expected:
- css tests PASS.
- Counters: `Rule_0_ast` calls drop from 22,326 to ≈ 4,059 (+ a small number of guard mispredictions; investigate anything > 5,000).
- Bench improves again; record median.

- [ ] **Step 6: Cross-package check** (same three packages as Task 2 Step 6) — PASS required. HTML is the critical one here: its role ladder has fallthrough TextNode roles; the "guard all but last probe" rule must leave single-fallthrough unions untouched (no guard emitted at all when only one fallthrough role exists — assert that html's generated source contains no `__untilTerminator_`).

- [ ] **Step 7: Commit**

```bash
git add packages/compiler packages/css/src/_generated
git commit -m "feat(compiler/v2): until-viability guard — skip impossible until-led alts in unions"
```

---

### Task 4: Lazy comment-list allocation in until-scans

**Files:**
- Modify: `packages/compiler/src/emit/v2/span.ts:1268` (`const __comments: [number, number][] = [];`) and the push site (`span.ts` near line 1413, `__comments.push([off, __ce + 2])`) and the consumer loop (lines ~1438-1456 of generated output; find the emitter lines via `grep -n "__comments" packages/compiler/src/emit/v2/span.ts`)

- [ ] **Step 1: Change emission** — `let __comments: [number, number][] | null = null;` … push site becomes `(__comments ??= []).push([off, __ce + 2]);` … consumer `if (__comments.length === 0)` becomes `if (__comments === null)`.

- [ ] **Step 2: Compiler suite + css regen + tests + bench**

```bash
cd packages/compiler && npm test && cd ../css && npm run generate:ts && npm test && npx tsx /tmp/css-prof.mjs
```
Expected: PASS; bench delta likely small — record it; keep the change regardless (strictly less allocation), unless it measurably regresses (revert if so).

- [ ] **Step 3: Commit**

```bash
git add packages/compiler packages/css/src/_generated
git commit -m "perf(compiler/v2): lazy comment-list allocation in until-scans"
```

---

### Task 5: Full-repo verification sweep + baseline updates + spec amendment

- [ ] **Step 1: Regenerate every parser package and run its tests**

```bash
cd /Users/valerii/Develop/parser3_codex
for p in css html markdown json toml yaml-block cron rrule iso-duration js-expr pg-select parser; do
  (cd packages/$p 2>/dev/null && npm run generate:ts --if-present && npm test) || echo "FAILED: $p";
done
```
Expected: no `FAILED:` lines. (Check each package's package.json — some may use `generate` instead of `generate:ts`; run what exists.)

- [ ] **Step 2: Record bench movement**

```bash
cd packages/css && npx tsx bench/ast.ts 2>&1 | tail -45
```
Compare against the baseline table in this plan's header region (2.76x/2.80x/2.87x vs postcss at 5KB/20KB/100KB). Add the new table to the commit message.

- [ ] **Step 3: Update css perf baseline + perf gates for all packages whose generated output changed**

```bash
cd packages/css && npm run perf:baseline && npm run size:baseline
```
(Other packages only if their generated source actually changed — `git status` shows it.)

- [ ] **Step 4: Amend the spec** — edit `docs/superpowers/specs/2026-06-10-codegen-perf-dx-design.md`: mark P1.1 as "investigated, measured neutral, dropped", P1.2 as "already implemented pre-spec", and record the Task 2/3 results under a new "## Outcomes" section with the measured numbers.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: regen all parsers, refresh perf baselines, record codegen perf outcomes"
```

---

### Task 6: raws-mode investigation (profile-gated, exploratory by design)

raws mode is 2.2× slower than fast mode. This task gathers the data and either fixes an obvious one-file win or produces a follow-up plan. It is intentionally NOT pre-scripted further — the spec gates this on profile output.

- [ ] **Step 1: Profile raws mode**

```bash
cat > /tmp/css-raws-prof.mjs <<'EOF'
const { render } = await import('/Users/valerii/Develop/parser3_codex/packages/css/src/_generated/parser.ts');
const { generateCss } = await import('/Users/valerii/Develop/parser3_codex/packages/css/bench/common.ts');
const input = generateCss(500*1024);
let t0 = performance.now();
while (performance.now()-t0 < 2000) render(input,{target:'ast',mode:'raws'});
t0 = performance.now();
let n=0;
while (performance.now()-t0 < 5000) { render(input,{target:'ast',mode:'raws'}); n++; }
console.log('ms/iter', ((performance.now()-t0)/n).toFixed(2));
EOF
cd /tmp && npx tsx --cpu-prof --cpu-prof-dir=/tmp/rawsprof /tmp/css-raws-prof.mjs
```

Then summarize hot self-time (same jq/node reduction as used for the fast-mode profile — see git history of this plan or rewrite: group cpuprofile samples by `callFrame.functionName`, sort desc).

- [ ] **Step 2: Decision checkpoint.** If ≥20% of self-time is in `posAt`/`makeSource`/`computeLineStarts` (the binary-search position machinery in the generated preamble, emitted from `emit/v2/runtime.ts` / `emit/preamble.ts`), implement incremental line tracking: thread a `lastLineIdx` cursor through `State` so `posAt` for monotonically increasing offsets is O(1) amortized (parse emits positions in roughly ascending order; verify with a counter before relying on it). If the raws gap is instead spread across the captures-path production functions, STOP and write a follow-up plan — that's the captures-path analog of Tasks 2/3 and needs its own design.

- [ ] **Step 3: Whichever branch was taken — tests + regen + bench + commit** (same verification commands as Task 4 Step 2).

```bash
git add -A
git commit -m "perf(compiler/v2): raws-mode position tracking (or: docs - raws follow-up plan)"
```

---

## Out of scope (per spec, deferred to the DX plan)

D1 union groups, D2 typed capture refs, D3 `--explain` — a separate plan after this one lands. P2's full scan-once capture reuse (feeding guard scan extents into the chosen production) is also deferred unless Task 3's counters show guards mispredicting.
