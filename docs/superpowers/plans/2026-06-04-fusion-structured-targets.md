# Fusion for Structured-Object Targets + Recursive Slots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the parse+render fusion machinery so a relation's `ast`-style targets (or any structured-object target — JSON, IR, etc.) get parsed AND built in a single pass — no intermediate `{__production, …}` captures object, no `__dispatchRender_X` walk. Universal benefit: every schema with a structured-body target gets the fast path that source already enjoys.

**Architecture:** Today `emit/v2/fusion.ts` emits `(state, out: string[]) => boolean` functions that write rendered strings to a side-effect buffer. That signature is incompatible with object-returning targets, so the current code gates structured/`ast` targets out at line 58 + 62 and falls back to the captures path. The plan: add a second fused-fn flavor `(state) => unknown | null` that returns the constructed object directly, picks up the same span/role machinery for parsing, but assembles its body inline from captured locals + recursive child calls. Eligibility is the conjunction of (a) every leaf field is a literal or a `$.ref` to a statically known span, and (b) every recursive-slot role itself has a structured-fused variant for the same target. Either side can bail out; ineligible (production, target) pairs continue to use the captures path verbatim.

**Tech Stack:** TypeScript compiler emit code in `packages/compiler/src/emit/v2/`. Generated runtime in `packages/*/src/_generated/parser.ts`. Node's built-in `test`/`assert`. Tinybench via `yarn bench`.

**Out of scope (first cut):**
- `mode: 'raws'` for structured-fused. Raws adds a `source: string` field per node via `makeSource(state, entryOff, off)`. The first cut falls back to captures path when `mode === 'raws'`; raws-fused can be a follow-up.
- Targets whose body is a top-level scalar / `$.ref` only (not wrapped in an object) — easy follow-up but adds case work; the first cut requires the top-level body to be an object literal (so the schema's intent is clearly "structured").
- Templates inside structured-object fields — e.g. `name: tpl\`${$.first}-${$.last}\``. First cut treats embedded Templates as fusion-ineligible; they go to captures.

---

## File Structure

- **Modify:** `packages/compiler/src/emit/v2/fusion.ts` — gate at the top of `emitFusedRender` becomes a body-shape switch: `Template` → existing path; structured-object → new path `emitFusedRenderStructured`. Existing Template emit is untouched.
- **Create:** `packages/compiler/src/emit/v2/fusion-structured.ts` — new module. Exports `emitFusedRenderStructured(production, schema, opts)` returning the new-shape function source or `null` on ineligibility. Lives next to `fusion.ts` so the diff stays surgical.
- **Modify:** `packages/compiler/src/emit/v2/index.ts` — emits a SECOND dispatch table per target (`__fusedRenderStructuredDispatch_<id>`) when at least one production fused structurally. The existing `__fusedRenderDispatch_<id>` keeps its meaning (Template/string fused fns). `__renderFused` learns to pick the right table per target.
- **Create:** `packages/compiler/test/fusion-structured.test.ts` — unit tests for the eligibility detector and a small per-shape emission spot-check.
- **Modify:** `packages/parser/test/generated-parser-ir.golden.json` — refresh whichever package hashes drift.

---

## Conventions used in every emitted structured-fused fn

```typescript
function __fusedRenderStructured_<NodeType>_<prodIdx>_<target>(
  state: State,
): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  // [skip leading ws]
  // [span 1 — populate local `<spanName>` from input.slice(...) or recursive call]
  // ...
  // [span N]
  state.pos = off;
  return <object literal built from locals>;
}
```

- Return `unknown` on success (the literal); the only failure signal is `null`. (Mirrors the captures-path parse fn contract — `null` on failure with `state.pos` rewound to `entryOff`.) The naming `__fusedRenderStructured_…` distinguishes it from the existing `__fusedRender_…` string fusion.
- Span emission reuses `emit/v2/span.ts`'s `emitSpan` exactly — it already produces the parse code AND binds capture locals. We hand `emitSpan` a `SpanBindings` instance and read it back at the end to assemble the body.
- Recursive slot emission picks up the existing `emit/v2/role-ladder.ts` style but calls `__fusedRenderStructured_<Role>_<idx>_<target>` instead of `parse<Role>` — when a child fused builder returns non-null, push it onto the children array; otherwise break the loop (mirroring repeats no-progress guard).

---

## Task 1: Add eligibility detector + minimal test

**Files:**
- Create: `packages/compiler/src/emit/v2/fusion-structured.ts` (detector only this task)
- Create: `packages/compiler/test/fusion-structured.test.ts`

- [ ] **Step 1: Write failing tests for the detector**

```typescript
// packages/compiler/test/fusion-structured.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { canFuseStructured } from '../src/emit/v2/fusion-structured.ts';

test('canFuseStructured rejects Template bodies (those use the string fusion)', () => {
  const schema = defineSchema({
    rootType: 'Pair',
    caseSensitive: true,
    punctuators: { dash: '-' },
    tokens: [],
    examples: [
      relation('Pair', {
        input: 'a-b',
        encodings: {
          parse: parse([span('a', 'a').ident(), literal('-'), span('b', 'b').ident()]),
          source: tpl`${$.a}-${$.b}`,
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  const prod = inferred.nodeTypes.get('Pair')!.productions[0]!;
  assert.equal(canFuseStructured(prod, inferred, 'source'), false);
});

test('canFuseStructured accepts an object-literal ast body with only $.ref leaves', () => {
  const schema = defineSchema({
    rootType: 'Pair',
    caseSensitive: true,
    punctuators: { dash: '-' },
    tokens: [],
    examples: [
      relation('Pair', {
        input: 'a-b',
        encodings: {
          parse: parse([span('a', 'a').ident(), literal('-'), span('b', 'b').ident()]),
          ast: { type: 'pair', a: $.a, b: $.b },
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  const prod = inferred.nodeTypes.get('Pair')!.productions[0]!;
  assert.equal(canFuseStructured(prod, inferred, 'ast'), true);
});

test('canFuseStructured rejects bodies whose ref points at an unknown span', () => {
  const schema = defineSchema({
    rootType: 'Pair',
    caseSensitive: true,
    punctuators: { dash: '-' },
    tokens: [],
    examples: [
      relation('Pair', {
        input: 'a-b',
        encodings: {
          parse: parse([span('a', 'a').ident(), literal('-'), span('b', 'b').ident()]),
          ast: { type: 'pair', a: $.a, missing: ($ as any).nonexistent },
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  const prod = inferred.nodeTypes.get('Pair')!.productions[0]!;
  assert.equal(canFuseStructured(prod, inferred, 'ast'), false);
});

test('canFuseStructured rejects a bare $.ref top-level body (must be object)', () => {
  const schema = defineSchema({
    rootType: 'Wrap',
    caseSensitive: true,
    punctuators: {},
    tokens: [],
    examples: [
      relation('Wrap', {
        input: 'x',
        encodings: {
          parse: parse([span('inner', 'x').ident()]),
          ast: $.inner,
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  const prod = inferred.nodeTypes.get('Wrap')!.productions[0]!;
  assert.equal(canFuseStructured(prod, inferred, 'ast'), false);
});
```

- [ ] **Step 2: Run, confirm fail**

```bash
cd /Users/valerii/Develop/parser3_codex
node --test --loader tsx packages/compiler/test/fusion-structured.test.ts 2>&1 | tail -15
```

Expected: `Cannot find module '.../fusion-structured.ts'` — module not yet created.

- [ ] **Step 3: Implement the detector**

```typescript
// packages/compiler/src/emit/v2/fusion-structured.ts
import { isStructureRef, isTemplate } from '@parser2/parser';
import type { RenderBody } from '@parser2/parser';
import type { InferredSchema, Production } from '../../model.ts';

/**
 * True when (production, target) is a candidate for the structured-fused
 * fast path: the target's body is an object literal where every leaf is
 * either a literal (string/number/boolean/null), a nested object/array of
 * literals, or a $.ref to a span name we can resolve in the production.
 *
 * Returns false for:
 *  - missing target
 *  - Template bodies (those use the string fusion)
 *  - top-level bare scalar / $.ref (first-cut restriction: top-level body
 *    must be an object so the result is clearly structured)
 *  - any $.ref to an unknown span
 *  - any embedded Template (first-cut restriction)
 */
export function canFuseStructured(
  production: Production,
  schema: InferredSchema,
  target: string,
): boolean {
  const entry = production.renders.get(target);
  if (!entry) return false;
  const body = entry.body;
  // First-cut: require a top-level object literal so the produced value is
  // unambiguously structured. Top-level Templates are the existing string
  // fusion's domain; top-level scalars/refs/arrays are deferred.
  if (body === null || typeof body !== 'object') return false;
  if (isStructureRef(body)) return false;
  if (isTemplate(body)) return false;
  if (Array.isArray(body)) return false;
  // Walk every leaf — refs must resolve to spans on this production; nested
  // Templates aren't supported yet.
  const spanNames = new Set<string>();
  for (const span of production.spans) if (span.name) spanNames.add(span.name);
  return bodyIsStaticOrResolved(body, spanNames);
}

function bodyIsStaticOrResolved(body: RenderBody, spanNames: ReadonlySet<string>): boolean {
  if (body === null) return true;
  if (typeof body === 'string' || typeof body === 'number' || typeof body === 'boolean') return true;
  if (isTemplate(body)) return false; // not yet supported
  if (isStructureRef(body)) {
    // $.spanName ref — must resolve to a real span on this production.
    const ref = body as { readonly name?: string };
    if (!ref.name) return false;
    return spanNames.has(ref.name);
  }
  if (Array.isArray(body)) {
    for (const child of body) if (!bodyIsStaticOrResolved(child, spanNames)) return false;
    return true;
  }
  for (const value of Object.values(body as Record<string, RenderBody>)) {
    if (!bodyIsStaticOrResolved(value, spanNames)) return false;
  }
  return true;
}
```

- [ ] **Step 4: Run, confirm 4/4 pass**

```bash
node --test --loader tsx packages/compiler/test/fusion-structured.test.ts 2>&1 | tail -10
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/compiler/src/emit/v2/fusion-structured.ts packages/compiler/test/fusion-structured.test.ts
git commit -m "feat(compiler): canFuseStructured eligibility detector for object-body fusion"
```

---

## Task 2: Emit the structured-fused fn body (no recursion yet)

For now: support productions whose body has NO recursive spans. The HTML attribute productions are a good first target — body is `{ name, value, ... }` with simple ident captures.

**Files:**
- Modify: `packages/compiler/src/emit/v2/fusion-structured.ts` (add `emitFusedRenderStructured`)
- Modify: `packages/compiler/test/fusion-structured.test.ts` (add an emit spot-check)

- [ ] **Step 1: Add emission test**

```typescript
test('emitFusedRenderStructured produces a function returning the object literal', () => {
  const schema = defineSchema({
    rootType: 'Pair',
    caseSensitive: true,
    punctuators: { dash: '-' },
    tokens: [],
    examples: [
      relation('Pair', {
        input: 'a-b',
        encodings: {
          parse: parse([span('a', 'a').ident(), literal('-'), span('b', 'b').ident()]),
          ast: { type: 'pair', a: $.a, b: $.b },
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  const prod = inferred.nodeTypes.get('Pair')!.productions[0]!;
  const src = emitFusedRenderStructured(prod, inferred, {
    nodeName: 'Pair',
    prodIdx: 0,
    target: 'ast',
  });
  assert.ok(src);
  // function name follows the structured naming convention
  assert.match(src, /function __fusedRenderStructured_Pair_0_ast\(state: State\): unknown/);
  // Returns the literal shape using captured locals
  assert.match(src, /return \{[^}]*type: "pair"[^}]*\}/);
  // Failure path rewinds and returns null
  assert.match(src, /state\.pos = entryOff;\s*return null;/);
});
```

Add the import at the top:
```typescript
import { canFuseStructured, emitFusedRenderStructured } from '../src/emit/v2/fusion-structured.ts';
```

Run, expect failure (`emitFusedRenderStructured` not exported yet).

- [ ] **Step 2: Implement the emit fn (no-recursion variant)**

Append to `packages/compiler/src/emit/v2/fusion-structured.ts`:

```typescript
import { jsString, indent } from '../strings.ts';
import { jsObjectKey } from '../strings.ts';
import { emitSpan, computeKnownLeadingBytes, hasModifier, type SpanBindings, type SpanContext } from './span.ts';

export type StructuredFusedOptions = {
  readonly nodeName: string;
  readonly prodIdx: number;
  readonly target: string;
};

/**
 * Emit a structured-fused render function. Returns null if the (production,
 * target) is ineligible (canFuseStructured is the gate). Otherwise returns
 * the function source.
 *
 * First-cut limitation: NO recursive spans on the production. The next task
 * lifts that.
 */
export function emitFusedRenderStructured(
  production: Production,
  schema: InferredSchema,
  opts: StructuredFusedOptions,
): string | null {
  if (!canFuseStructured(production, schema, opts.target)) return null;
  // First-cut: bail on any recursive span; Task 3 handles them.
  for (const span of production.spans) {
    if (span.recursiveRoles.length > 0) return null;
  }
  const entry = production.renders.get(opts.target)!;

  // Build the SpanContext exactly the way production.ts does. We can copy
  // the relevant subset.
  const tokenClasses = new Set<string>();
  let cssIdent = false;
  for (const usage of schema.classes) {
    tokenClasses.add(usage.class);
    if (usage.class === 'ident' && usage.refinements.some((r) => r.name === 'css')) cssIdent = true;
  }
  const hasContentClass = schema.classes.some((c) =>
    new Set(['ident', 'keyword', 'number', 'hex', 'string', 'regex', 'template', 'operator']).has(c.class),
  );
  const emitUnknownCharsGuard = schema.unknownChars === 'reject' && hasContentClass;

  const bindings: SpanBindings = {
    valueExpr: new Map(),
    presenceExpr: new Map(),
    startOffExpr: new Map(),
    endOffExpr: new Map(),
  };
  const ctx: SpanContext = {
    entryOffVar: 'entryOff',
    raws: false,
    tokens: tokenClasses,
    cssIdent,
    nodeTypes: schema.nodeTypes,
    emitUnknownCharsGuard,
    knownBytes: computeKnownLeadingBytes(schema),
    symbolPrefix: schema.symbolPrefix,
  };

  const lines: string[] = [];
  lines.push(`const input = state.input;`);
  lines.push(`const len = state.len;`);
  lines.push(`let off = state.pos;`);
  lines.push(`const entryOff = off;`);
  lines.push(skipWsBlock());
  for (let i = 0; i < production.spans.length; i++) {
    const span = production.spans[i]!;
    if (i > 0) lines.push(skipWsBlock());
    lines.push(emitSpan(span, ctx, bindings));
  }
  lines.push(`state.pos = off;`);
  lines.push(`if (off > state.maxOff) state.maxOff = off;`);
  // Inline-build the body using the bindings.
  const bodyExpr = emitStructuredBody(entry.body, bindings);
  lines.push(`return ${bodyExpr};`);

  const fnName = `__fusedRenderStructured_${jsIdent(opts.nodeName)}_${opts.prodIdx}_${jsIdent(opts.target)}`;
  return `function ${fnName}(state: State): unknown {
${indent(lines.filter((l) => l !== '').join('\n'), 1)}
}`;
}

function emitStructuredBody(body: RenderBody, bindings: SpanBindings): string {
  if (body === null) return 'null';
  if (typeof body === 'string') return jsString(body);
  if (typeof body === 'number') return Number.isFinite(body) ? String(body) : 'null';
  if (typeof body === 'boolean') return body ? 'true' : 'false';
  if (isStructureRef(body)) {
    const ref = body as { readonly name: string };
    const expr = bindings.valueExpr.get(ref.name);
    if (!expr) throw new Error(`emitStructuredBody: span ref "${ref.name}" has no binding`);
    return expr;
  }
  if (Array.isArray(body)) {
    return `[${body.map((c) => emitStructuredBody(c, bindings)).join(', ')}]`;
  }
  const entries = Object.entries(body as Record<string, RenderBody>)
    .map(([k, v]) => `${jsObjectKey(k)}: ${emitStructuredBody(v, bindings)}`);
  return `{ ${entries.join(', ')} }`;
}

function skipWsBlock(): string {
  return `while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }`;
}
```

Add the missing imports at the top of the file:
```typescript
import { jsIdent } from '../strings.ts';
```

- [ ] **Step 3: Run the test — expect pass**

```bash
node --test --loader tsx packages/compiler/test/fusion-structured.test.ts 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add packages/compiler/src/emit/v2/fusion-structured.ts packages/compiler/test/fusion-structured.test.ts
git commit -m "feat(compiler): structured-fused emit for non-recursive productions"
```

---

## Task 3: Handle recursive slots (the hard part)

When a span has `recursiveRoles.length > 0` (e.g. HTML's `span('children', …).of('HtmlElement', 'TextNode').repeats({…})`), the structured-fused fn needs to build an array of child objects in place.

**Files:**
- Modify: `packages/compiler/src/emit/v2/fusion-structured.ts`

- [ ] **Step 1: Add a test exercising recursive slots**

```typescript
test('emitFusedRenderStructured handles a recursive repeats slot', () => {
  const schema = defineSchema({
    rootType: 'List',
    caseSensitive: true,
    punctuators: { open: '[', close: ']', comma: ',' },
    tokens: [],
    examples: [
      relation('List', {
        input: '[a,b]',
        encodings: {
          parse: parse([
            literal('['),
            span('items', 'a').of('Item').repeats({ min: 0, sep: ',' }),
            literal(']'),
          ]),
          ast: { type: 'list', items: $.items },
        },
      }),
      relation('Item', {
        input: 'a',
        encodings: {
          parse: parse([span('name', 'a').ident()]),
          ast: { type: 'item', name: $.name },
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  const prod = inferred.nodeTypes.get('List')!.productions[0]!;
  const src = emitFusedRenderStructured(prod, inferred, {
    nodeName: 'List',
    prodIdx: 0,
    target: 'ast',
  });
  assert.ok(src, 'List should be fusable');
  // Reference Item via its structured-fused fn
  assert.match(src, /__fusedRenderStructured_Item_0_ast\(state\)/);
  // Items get collected into an array
  assert.match(src, /items\.push\(/);
});
```

Run, expect failure (recursive guard rejects).

- [ ] **Step 2: Lift the recursive guard + emit per-span structured collection**

In `emitFusedRenderStructured` (Task 2 above), replace:
```typescript
for (const span of production.spans) {
  if (span.recursiveRoles.length > 0) return null;
}
```
with a per-role fusability check — every role referenced by every recursive span must itself be structurally fusable for `opts.target`. Cache results to avoid quadratic blow-up on schemas with mutual recursion (HTML's children loop dispatches into HtmlElement which dispatches back).

```typescript
const cache = new Map<string, boolean>();
for (const span of production.spans) {
  for (const role of span.recursiveRoles) {
    if (!isRoleStructurallyFusable(role, schema, opts.target, cache)) return null;
  }
}
```

Add the helper (with cycle detection — set a role to `true` BEFORE recursing into its children, so self-recursive references see the optimistic answer and don't infinite-loop):

```typescript
function isRoleStructurallyFusable(
  role: string,
  schema: InferredSchema,
  target: string,
  cache: Map<string, boolean>,
): boolean {
  const cached = cache.get(role);
  if (cached !== undefined) return cached;
  cache.set(role, true); // optimistic, breaks cycles
  const info = schema.nodeTypes.get(role);
  if (!info || info.productions.length === 0) {
    cache.set(role, false);
    return false;
  }
  for (const prod of info.productions) {
    if (!canFuseStructured(prod, schema, target)) {
      cache.set(role, false);
      return false;
    }
    for (const span of prod.spans) {
      for (const childRole of span.recursiveRoles) {
        if (!isRoleStructurallyFusable(childRole, schema, target, cache)) {
          cache.set(role, false);
          return false;
        }
      }
    }
  }
  cache.set(role, true);
  return true;
}
```

Now extend the span emit loop. For non-recursive spans, the existing `emitSpan` path is fine. For recursive spans, we need a custom emission that:
1. Allocates a local array `<spanName>` (typed `unknown[]`)
2. Runs a while loop with the same stopBefore / sep / min / max semantics as the captures path
3. Dispatches to each role's structured-fused fn via byte-prefix routing (mirrors the role-ladder shape)
4. Pushes successful child returns into the array
5. Breaks on null candidate

In `emitFusedRenderStructured`, replace the per-span loop:

```typescript
for (let i = 0; i < production.spans.length; i++) {
  const span = production.spans[i]!;
  if (i > 0) lines.push(skipWsBlock());
  if (span.recursiveRoles.length > 0) {
    lines.push(emitStructuredRecursiveSpan(span, ctx, bindings, opts.target));
  } else {
    lines.push(emitSpan(span, ctx, bindings));
  }
}
```

And add `emitStructuredRecursiveSpan`:

```typescript
function emitStructuredRecursiveSpan(
  span: ResolvedSpan,
  ctx: SpanContext,
  bindings: SpanBindings,
  target: string,
): string {
  const name = span.name;
  if (!name) throw new Error('emitStructuredRecursiveSpan: recursive span without name');
  const repeats = span.modifiers.find((m) => m.kind === 'repeats') as
    | { readonly kind: 'repeats'; readonly min?: number; readonly max?: number; readonly sep?: string; readonly stopBefore?: ReadonlyArray<string> }
    | undefined;
  if (!repeats) {
    // Recursive non-repeats span — single dispatch attempt.
    const dispatch = emitFusedStructuredDispatch(span.recursiveRoles, target);
    bindings.valueExpr.set(name, name);
    return `let ${name}: unknown = null;
{
  const __before = off;
  state.pos = off;
${indent(dispatch, 1)}
  if (${name} === null) off = __before;
  else off = state.pos;
}`;
  }
  // Repeats — accumulate into an array.
  bindings.valueExpr.set(name, name);
  const min = repeats.min ?? 0;
  const max = repeats.max;
  const sep = repeats.sep;
  const stopBefore = repeats.stopBefore;
  const dispatch = emitFusedStructuredDispatch(span.recursiveRoles, target);
  const lines: string[] = [];
  lines.push(`const ${name}: unknown[] = [];`);
  if (sep !== undefined) lines.push(`let __sepConsumed = false;`);
  lines.push(`while (true) {`);
  lines.push(`  const __loopStart = off;`);
  if (sep !== undefined) {
    lines.push(`  ${skipWsBlock()}`);
    lines.push(`  if (${name}.length > 0) {`);
    lines.push(`    if (!(${literalMatchExpr(sep, 'off')})) break;`);
    lines.push(`    off += ${sep.length};`);
    lines.push(`    ${skipWsBlock()}`);
    lines.push(`    __sepConsumed = true;`);
    lines.push(`  }`);
  } else {
    lines.push(`  ${skipWsBlock()}`);
  }
  if (stopBefore && stopBefore.length > 0) {
    lines.push(`  if (off < len) {`);
    lines.push(`    const __sb = input.charCodeAt(off);`);
    for (const stop of stopBefore) {
      lines.push(`    if (__sb === ${stop.charCodeAt(0)} && input.startsWith(${jsString(stop)}, off)) break;`);
    }
    lines.push(`  }`);
  }
  lines.push(`  let __cand: unknown = null;`);
  lines.push(`  state.pos = off;`);
  lines.push(indent(dispatch, 1));
  lines.push(`  if (__cand === null) break;`);
  lines.push(`  ${name}.push(__cand);`);
  lines.push(`  off = state.pos;`);
  lines.push(`  if (off === __loopStart) break;`);
  lines.push(`}`);
  if (min > 0) {
    lines.push(`if (${name}.length < ${min}) { state.pos = entryOff; return null; }`);
  }
  if (max !== undefined) {
    lines.push(`if (${name}.length > ${max}) { state.pos = entryOff; return null; }`);
  }
  return lines.join('\n');
}

function emitFusedStructuredDispatch(roles: ReadonlyArray<string>, target: string): string {
  // First cut: serial speculation with state.pos rewind on null. Each role
  // is tried by calling its structured-fused fn directly. The role-ladder's
  // byte-prefix optimisation lives in role-ladder.ts; we can plug in later.
  const lines: string[] = [];
  const fnNameOf = (role: string) => `__fusedRenderStructured_${role}_0_${target}`;
  // NOTE: roles can have multiple productions; we dispatch via the role's
  // captures-path dispatcher equivalent — but for structured fusion we go
  // one production at a time. If the role has >1 productions, we'd need a
  // per-role wrapper. First cut: assert role has exactly 1 production,
  // OR — better — use the dispatcher that's already generated for the
  // captures-path and let it call into our structured fns. Implementation
  // detail to confirm in Task 3 review.
  for (const role of roles) {
    lines.push(`__cand = ${fnNameOf(role)}(state);`);
    lines.push(`if (__cand !== null) { off = state.pos; } else { state.pos = off; }`);
  }
  // After this block __cand is either the successful object or null.
  return lines.join('\n');
}

function literalMatchExpr(text: string, offVar: string): string {
  if (text.length === 1) return `input.charCodeAt(${offVar}) === ${text.charCodeAt(0)}`;
  return `input.startsWith(${jsString(text)}, ${offVar})`;
}
```

> **NOTE during execution:** the multi-production-per-role question above is real. Cheapest first cut: emit a per-role STRUCTURED dispatcher that tries each production's structured-fused fn in order — call it `__fusedRenderStructuredDispatch_<Role>_<target>(state)`. Generate it once per (role, target) when at least one production is structurally fusable. Then `emitFusedStructuredDispatch` calls this dispatcher instead of a single production's fn directly. If this dispatcher emission gets large, factor it into its own helper. Document this decision inline before implementing.

- [ ] **Step 3: Run the test — expect pass**

```bash
node --test --loader tsx packages/compiler/test/fusion-structured.test.ts 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add packages/compiler/src/emit/v2/fusion-structured.ts packages/compiler/test/fusion-structured.test.ts
git commit -m "feat(compiler): structured-fused recursive slot emission"
```

---

## Task 4: Wire structured-fused into the emit pipeline

**Files:**
- Modify: `packages/compiler/src/emit/v2/fusion.ts` (delegate to structured emit when body is non-Template)
- Modify: `packages/compiler/src/emit/v2/index.ts` (emit per-(role, target) structured dispatchers; emit a second dispatch table per target; `__renderFused` consults it before the captures path)

- [ ] **Step 1: Have `fusion.ts` consult the structured emit when body isn't Template**

Read `packages/compiler/src/emit/v2/fusion.ts` lines 52–80. Modify so when `entry.body` isn't a Template, the function calls `emitFusedRenderStructured` and either returns its result (if non-null) or `null` (fallback to captures path). Keep the existing Template path untouched.

- [ ] **Step 2: In `emit/v2/index.ts`, add a second per-target dispatch table for structured-fused fns**

Where the existing `emitFusion` (function in index.ts, around lines 101–147) groups Template-fused fns into `__fusedRenderDispatch_<id>`, add a parallel scan that:
1. For each (production, target) pair, call `emitFusedRenderStructured`.
2. If non-null, register the fn in `__fusedRenderStructuredDispatch_<id>`.

Both tables are emitted side-by-side. Existing dispatch table is untouched (so source-target Template fusion still works exactly as today).

- [ ] **Step 3: Update `__renderFused` to consult the structured table first**

In `emit/v2/index.ts` (around line 167+ where `__renderFused` is emitted), make the body:
```typescript
function __renderFused(input: string, target: string): unknown | string | null {
  // Try structured first
  const sTable = __fusedRenderStructuredDispatchLookup(target);
  if (sTable !== null) {
    const fn = sTable[__rootProductionKey];
    if (fn !== undefined) {
      // preamble + state init (mode 'fast' only)
      const result = fn(state);
      if (result === null) return null;
      if (state.pos !== input.length) return null;
      return result;
    }
  }
  // Existing string-target Template path
  const table = __fusedRenderDispatchLookup(target);
  if (table === null) return null;
  // ... existing body ...
}
```

Per-target lookups can be a small switch by target name (deterministic alphabetisation, like the existing `__fusedRenderDispatchLookup`).

- [ ] **Step 4: Regenerate + smoke-check**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run generate 2>&1 | tail -5
cd packages/markdown && npm run generate 2>&1 | tail -2 && cd ../yaml-block && npm run generate 2>&1 | tail -2 && cd ../cron && npm run generate 2>&1 | tail -2
```

Read `packages/html/src/_generated/parser.ts` and grep for `__fusedRenderStructured_HtmlElement` — multiple structured-fused functions for HtmlElement productions should appear. Spot-check one for sanity (no captures object, returns the literal object directly).

- [ ] **Step 5: Run the full test suite + bump golden hash**

```bash
npm test 2>&1 | grep -E '^# (tests|pass|fail)' | head -30
```

If only the byte-stable hash fails: compute new hashes, update `packages/parser/test/generated-parser-ir.golden.json` for the drifted packages.

```bash
shasum -a 256 packages/css/src/_generated/parser.ts packages/html/src/_generated/parser.ts packages/markdown/src/_generated/parser.ts packages/cron/src/_generated/parser.ts packages/yaml-block/src/_generated/parser.ts
```

Edit golden, re-run npm test, expect green.

- [ ] **Step 6: Commit**

```bash
git add packages/compiler/src/emit/v2/fusion.ts packages/compiler/src/emit/v2/index.ts packages/html/src/_generated/parser.ts packages/css/src/_generated/parser.ts packages/parser/test/generated-parser-ir.golden.json
# any other packages whose hash drifted
git commit -m "feat(compiler): wire structured-fused path into __renderFused"
```

---

## Task 5: Bench

**Files:** none modified.

- [ ] **Step 1: Run html bench, record per-size delta vs pre-change**

```bash
cd /Users/valerii/Develop/parser3_codex/packages/html
yarn bench 2>&1 | grep -E 'parser2 html parse fast|parse5 parse|^----|huge-page|^[0-9]+KB'
```

Compare against this session's pre-change numbers (Path 1 + Path 2 + two-byte gate landed; structured-fusion NOT). Expectation: noticeable wins on every size — primarily from skipping the captures object allocation + dispatch walk. Direction: **down** on parser2 fast and raws times.

- [ ] **Step 2: Run css bench, look for unintended regressions**

```bash
cd /Users/valerii/Develop/parser3_codex/packages/css
yarn bench 2>&1 | grep -E 'parser2 css|postcss|^[0-9]+KB|huge-page'
```

Expectation: similar wins on `parser2 css fast`. If css drops or stays flat, that means css's ast bodies didn't pass eligibility — read the css schema to confirm whether they're object-bodied with simple refs, or whether we missed a case.

- [ ] **Step 3: Report the numbers; do not commit anything in this task.**

Bench output is the deliverable.

---

## Self-Review

**1. Spec coverage:**
- F1 (structured-object bodies) → Task 2 covers non-recursive; Task 3 covers recursive.
- F2 (recursive slots) → Task 3.
- Wiring + test surface → Task 4.
- Validation → Task 5.

**2. Placeholder scan:**
- Task 3 Step 2 has a `NOTE during execution` block about the multi-production-per-role question. That's a real design decision that surfaces during implementation; the note documents both the question AND the chosen first-cut answer (per-role structured dispatcher). Not a placeholder.
- All code blocks contain actual code.

**3. Type consistency:**
- `canFuseStructured` signature stable across tasks.
- `emitFusedRenderStructured` signature stable across tasks (Task 2 declares; Task 3 extends body; Task 4 wires).
- Naming: `__fusedRenderStructured_<NodeType>_<prodIdx>_<target>` and `__fusedRenderStructuredDispatch_<Role>_<target>` consistent across all tasks.
- Return type `unknown | null` consistent.

**4. Risk flags caught during plan-writing:**
- Mode 'raws' deliberately excluded from first cut (documented in "Out of scope").
- Top-level scalar/ref bodies deliberately excluded (documented).
- Embedded Templates inside structured bodies deliberately excluded (documented).
- The multi-production-per-role question is flagged in Task 3 with a concrete first-cut answer.
- Bench measurement under high system load remains a known issue; Task 5 documents the comparison baseline.
