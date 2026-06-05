# Flat JSON Target Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add native DSL + compiler support for "flat object" render targets — bodies where a captured value is used as the *key* of an object (dynamic key) and arrays of children are merged into one object. Concretely: `.foo { color: red }` ⇄ `{ ".foo": { "color": "red" } }` for CSS. Schema-agnostic — any schema can declare such a target.

**Architecture:** Two new `RenderBody` constructs in `@parser2/parser`:
- `dynKey($.refName, valueBody)` → at render time produces `{[<resolved-ref>]: <renderedValue>}`. At inverse time consumes the object's single entry, binding the key to `captures[refName]` and recursing on the value.
- `merge(arrayBodyOrRef)` → at render time produces `Object.assign({}, ...<array>.filter(x => x && typeof x === 'object'))`. At inverse time iterates the object's entries; each entry is dispatched through the recursive role's per-production inverse, with value-type discrimination (`string → Declaration`-shape; `object → Rule`-shape) to pick the right production.

Inverse role-dispatch leans on the constraint the schema author chose (skip Comments, skip at-rules in the flat shape — return `null` body for those productions so they get filtered out by `merge`). The remaining roles in CSS partition cleanly by value type: Declaration values are strings; Rule values are objects. That gives a one-step discrimination without needing more DSL machinery.

**Tech Stack:** TypeScript across `packages/parser/`, `packages/compiler/src/emit/`, `packages/compiler/src/infer/invert.ts`, `packages/css/src/schema.ts`. Node's built-in `test`/`assert` runner.

**Out of scope (first cut):**
- At-rules + comments in the flat shape — the schema author declares `json: null` for them; the `merge` semantics filter null entries.
- Custom key constructions (e.g. `\`@${name} ${params}\`` for an at-rule key). Only `$.ref` keys this cut.
- `!important` discriminator — Declaration#0 (with !important) declares `json: null` for the first cut; only plain declarations participate.
- The structured-fusion fast path. Flat-json bodies fall back to the captures path via `canFuseStructured(...) === false` (their body has dynKey/merge which fail the static-resolution test). Performance is captures-path-bounded — acceptable for a first cut.
- The round-trip exemption already extends to `json` (landed earlier this session). Path B's flat shape inherits it.

---

## File Structure

- **Modify:** `packages/parser/src/types.ts` — extend `RenderBody` union with `DynKeyBody | MergeBody`.
- **Create:** `packages/parser/src/body-builders.ts` — exports `dynKey()` and `merge()` builder fns + type guards `isDynKey`, `isMerge`. Or fold into existing `ref.ts` / `template.ts` style file.
- **Modify:** `packages/parser/src/index.ts` — re-export the new builders so schema authors can `import { dynKey, merge } from '@parser2/parser'`.
- **Modify:** `packages/compiler/src/emit/render.ts` — `emitBodyExpr` learns to handle `DynKeyBody` and `MergeBody`.
- **Modify:** `packages/compiler/src/infer/invert.ts` — derive inverse IR for the new body shapes. Adds two new `InverseIR` kinds: `dynKey` and `merge`.
- **Modify:** `packages/compiler/src/model.ts` — extend `InverseIR` union with the new kinds.
- **Modify:** `packages/compiler/src/emit/inverse.ts` — emit code for the new inverse kinds.
- **Modify:** `packages/compiler/src/emit/rebuild.ts` — handle the new body shapes when reading captures back from a target value.
- **Modify:** `packages/css/src/schema.ts` — declare `json:` bodies using the new builders on Rule, Declaration#1 (plain), and Stylesheet. Set `json: null` on Comment, both AtRule productions, and Declaration#0 (with !important).
- **Create:** `packages/compiler/test/flat-json.test.ts` — unit tests for the builders + a small end-to-end forward/inverse round-trip on a synthetic schema.
- **Modify:** `packages/parser/test/generated-parser-ir.golden.json` — refresh css hash.

---

## Conventions

### Forward render emit for `dynKey($.k, value)`:
```typescript
({ [captures.k]: <emitBodyExpr(value)> })
```

### Forward render emit for `merge($.arr)`:
```typescript
(() => {
  const __m = {};
  const __a = captures.arr;
  if (Array.isArray(__a)) {
    for (let i = 0; i < __a.length; i++) {
      const __it = __a[i];
      if (__it && typeof __it === 'object') Object.assign(__m, __it);
    }
  }
  return __m;
})()
```

### Inverse derivation for `dynKey($.k, valueBody)`:
- Input: an object with exactly ONE key
- Bind `captures[k]` = the entry's key
- Recursively inverse on the entry's value to extract more captures
- If input has zero or >1 keys → throw "expected single-entry object"

### Inverse derivation for `merge($.arr)`:
- Input: an object with N entries
- `captures.arr` = array of per-entry sub-captures
- For each `[key, value]` entry: wrap as `{[key]: value}` and dispatch through the role's production inverses in declaration order. Per-production discrimination by value type (a production whose body is `dynKey(_, ref)` where the value ref is a string-capturing span matches when entry value is a string; the same when value ref is recursive matches when entry value is an object). First production that doesn't throw wins.

---

## Task 1: Add DSL builders + types

**Files:**
- Modify: `packages/parser/src/types.ts`
- Create: `packages/parser/src/body-builders.ts`
- Modify: `packages/parser/src/index.ts`

- [ ] **Step 1: Failing test for builder shapes**

```typescript
// packages/parser/test/body-builders.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { $, dynKey, merge, isDynKey, isMerge } from '../src/index.ts';

test('dynKey produces a tagged object with key ref + value body', () => {
  const body = dynKey($.selector, $.nodes);
  assert.equal(isDynKey(body), true);
  assert.equal((body as any).__dynKey, true);
  assert.equal((body as any).key.name, 'selector');
});

test('merge produces a tagged object with the array ref', () => {
  const body = merge($.nodes);
  assert.equal(isMerge(body), true);
  assert.equal((body as any).__merge, true);
  assert.equal((body as any).array.name, 'nodes');
});

test('isDynKey rejects plain objects + Templates + refs', () => {
  assert.equal(isDynKey({ type: 'x' }), false);
  assert.equal(isDynKey($.name), false);
});

test('isMerge rejects plain objects + refs', () => {
  assert.equal(isMerge({}), false);
  assert.equal(isMerge($.x), false);
});
```

Run:
```bash
cd /Users/valerii/Develop/parser3_codex
node --test --loader tsx packages/parser/test/body-builders.test.ts 2>&1 | tail -10
```
Expected: fails — `dynKey` and `merge` not exported.

- [ ] **Step 2: Add types in `packages/parser/src/types.ts`**

Find the `RenderBody` union (~line 269) and add:

```typescript
export interface DynKeyBody {
  readonly __dynKey: true;
  readonly key: StructureRef;
  readonly value: RenderBody;
}

export interface MergeBody {
  readonly __merge: true;
  readonly array: StructureRef;
}
```

Extend `RenderBody`:
```typescript
export type RenderBody =
  | string
  | number
  | boolean
  | null
  | StructureRef
  | Template
  | DynKeyBody     // NEW
  | MergeBody      // NEW
  | ReadonlyArray<RenderBody>
  | { readonly [key: string]: RenderBody };
```

- [ ] **Step 3: Create `packages/parser/src/body-builders.ts`**

```typescript
import type { DynKeyBody, MergeBody, RenderBody, StructureRef } from './types.ts';

/**
 * Use a captured value as the key of a single-entry object.
 *
 * Forward:  dynKey($.selector, $.body) — produces `{ [captures.selector]: <body> }`
 * Inverse:  reads the single-entry object's key → captures.selector; recurses on value.
 *
 * For schemas authoring "flat" target shapes (e.g. CSS `{ '.foo': {...} }`)
 * where the JSON key is a captured value rather than a fixed schema literal.
 */
export function dynKey(key: StructureRef, value: RenderBody): DynKeyBody {
  return { __dynKey: true, key, value };
}

/**
 * Merge an array of objects (each typically produced by a child production's
 * own dynKey) into a single object via Object.assign. Entries that aren't
 * objects (e.g. children whose body returned null) are filtered.
 *
 * Forward:  merge($.nodes) — produces `Object.assign({}, ...nodes.filter(o => o && typeof o === 'object'))`
 * Inverse:  iterates entries of the input object; each entry is dispatched
 *           through the recursive role's per-production inverse in
 *           declaration order (value-type discrimination picks the right
 *           production: string value → Declaration-shape; object value →
 *           Rule-shape).
 */
export function merge(array: StructureRef): MergeBody {
  return { __merge: true, array };
}

export function isDynKey(value: unknown): value is DynKeyBody {
  return typeof value === 'object' && value !== null && (value as { __dynKey?: unknown }).__dynKey === true;
}

export function isMerge(value: unknown): value is MergeBody {
  return typeof value === 'object' && value !== null && (value as { __merge?: unknown }).__merge === true;
}
```

- [ ] **Step 4: Re-export from `packages/parser/src/index.ts`**

Add the new exports next to existing builder exports.

- [ ] **Step 5: Test passes**

```bash
node --test --loader tsx packages/parser/test/body-builders.test.ts 2>&1 | tail -10
```
Expected: 4 pass.

- [ ] **Step 6: Commit**

```bash
git add packages/parser/src/types.ts packages/parser/src/body-builders.ts packages/parser/src/index.ts packages/parser/test/body-builders.test.ts
git commit -m "feat(parser): dynKey + merge body builders for flat-object render targets"
```

---

## Task 2: Forward render emit

**Files:**
- Modify: `packages/compiler/src/emit/render.ts` — `emitBodyExpr` learns dynKey + merge

- [ ] **Step 1: Add a failing emit test**

```typescript
// packages/compiler/test/flat-json.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { $, defineSchema, dynKey, literal, merge, parse, relation, span, tpl } from '@parser2/parser';
import { generateParser, loadV2Parser } from './_helpers.ts'; // existing helpers

test('flat-json forward: Declaration produces { [prop]: value }', async () => {
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      relation('Decl', {
        input: 'color: red',
        encodings: {
          parse: parse([
            span('prop', 'color').until([':']),
            literal(':'),
            span('value', 'red').until([]),
          ]),
          source: tpl`${$.prop}: ${$.value}`,
          json: dynKey($.prop, $.value),
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  assert.deepEqual(render('color: red', { target: 'json' }), { color: 'red' });
});
```

(Use whatever existing test helpers exist — `loadV2Parser` is the conventional one in `packages/compiler/test`.)

Run, expect failure (emit doesn't handle DynKeyBody).

- [ ] **Step 2: Extend `emitBodyExpr` in `packages/compiler/src/emit/render.ts`**

Just before the final object-literal fallback (~line 127), add branches:

```typescript
import { isDynKey, isMerge } from '@parser2/parser';
// ...

if (isDynKey(body)) {
  const keyExpr = emitRefExpr(body.key, target);
  const valExpr = emitBodyExpr(body.value, target, production);
  return `({ [${keyExpr}]: ${valExpr} })`;
}
if (isMerge(body)) {
  const arrExpr = emitRefExpr(body.array, target);
  return `(() => {
    const __m: any = {};
    const __a = ${arrExpr};
    if (Array.isArray(__a)) {
      for (let __i = 0; __i < __a.length; __i++) {
        const __it = __a[__i];
        if (__it && typeof __it === 'object') Object.assign(__m, __it);
      }
    }
    return __m;
  })()`;
}
```

- [ ] **Step 3: Test passes**

Run the test; expect pass.

- [ ] **Step 4: Add a multi-entry merge test**

```typescript
test('flat-json forward: Rule with merged declarations', async () => {
  const schema = defineSchema({
    rootType: 'Rule',
    examples: [
      relation('Decl', {
        input: 'color: red',
        encodings: {
          parse: parse([span('prop', 'color').until([':']), literal(':'), span('value', 'red').until([';', '}'])]),
          source: tpl`${$.prop}: ${$.value}`,
          json: dynKey($.prop, $.value),
        },
      }),
      relation('Rule', {
        input: '.foo { color: red; font-size: 12px }',
        encodings: {
          parse: parse([
            span('selector', '.foo').until(['{']),
            literal('{'),
            span('decls', 'color: red').of('Decl').repeats({ sep: ';', trailing: 'allowed' }),
            literal('}'),
          ]),
          source: tpl`${$.selector} {${$.decls}}`,
          json: dynKey($.selector, merge($.decls)),
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  assert.deepEqual(
    render('.foo { color: red; font-size: 12px }', { target: 'json' }),
    { '.foo': { color: 'red', 'font-size': '12px' } },
  );
});
```

Run, expect pass.

- [ ] **Step 5: Commit**

```bash
git add packages/compiler/src/emit/render.ts packages/compiler/test/flat-json.test.ts
git commit -m "feat(compiler): emit forward render for dynKey + merge bodies"
```

---

## Task 3: Inverse derivation + emit

**Files:**
- Modify: `packages/compiler/src/model.ts` — extend `InverseIR` with `dynKey` + `merge` kinds
- Modify: `packages/compiler/src/infer/invert.ts` — derive the new kinds
- Modify: `packages/compiler/src/emit/inverse.ts` — emit code for the new kinds
- Modify: `packages/compiler/src/emit/rebuild.ts` — handle the new kinds in rebuild (used by inverse)

- [ ] **Step 1: Add InverseIR kinds in `packages/compiler/src/model.ts`**

Extend the `InverseIR` union:
```typescript
| {
    readonly kind: 'dynKey';
    readonly keyCapture: string;             // which capture receives the entry key
    readonly value: InverseIR;               // recursive inverse on the entry value
  }
| {
    readonly kind: 'merge';
    readonly arrayCapture: string;           // which capture receives the array of per-entry sub-captures
    readonly perEntryInverses: ReadonlyArray<InverseIR>; // role's per-production inverses, in declaration order
  };
```

- [ ] **Step 2: Derive in `packages/compiler/src/infer/invert.ts`**

Find the body-walker (the function that takes a `RenderBody` and produces an `InverseIR`). Add branches:

```typescript
if (isDynKey(body)) {
  const valueInverse = deriveInverseFromBody(body.value, production, /* ... existing args */);
  return { kind: 'dynKey', keyCapture: body.key.name, value: valueInverse };
}
if (isMerge(body)) {
  // Look up the recursive role from the production's spans — body.array.name
  // must reference a recursive repeats span.
  const span = findSpanByName(production, body.array.name);
  if (!span || span.recursiveRoles.length === 0) {
    throw new Error('merge: array ref must point at a recursive repeats span');
  }
  const perEntryInverses: InverseIR[] = [];
  for (const role of span.recursiveRoles) {
    const info = schema.nodeTypes.get(role);
    if (!info) continue;
    for (const prod of info.productions) {
      const targetEntry = prod.renders.get(targetName);
      if (!targetEntry) continue;
      if (targetEntry.body === null) continue; // schema-author said skip this production
      perEntryInverses.push(deriveInverseFromBody(targetEntry.body, prod, /* ... */));
    }
  }
  return { kind: 'merge', arrayCapture: body.array.name, perEntryInverses };
}
```

- [ ] **Step 3: Emit in `packages/compiler/src/emit/inverse.ts`**

Add a handler for each new kind:

```typescript
function emitInverseIRBody(ir: InverseIR, target: string, /* ... */): string {
  switch (ir.kind) {
    case 'dynKey': {
      const valueEmit = emitInverseIRBody(ir.value, target, /* ... */);
      return `(() => {
        const __keys = Object.keys(__v);
        if (__keys.length !== 1) throw new Error('inverse: expected single-entry object, got ' + __keys.length);
        const __k = __keys[0];
        captures.${ir.keyCapture} = __k;
        const __v = (__v as Record<string, unknown>)[__k];
        ${valueEmit}
      })()`;
    }
    case 'merge': {
      // For each entry of the object, dispatch via per-production inverse.
      // Value-type discrimination is implicit: each production's inverse
      // throws on shape mismatch; the first one that succeeds wins.
      const tries = ir.perEntryInverses.map((sub, i) => {
        return `try { ${emitInverseIRBody(sub, target, /* ... */)}; ${ir.arrayCapture}.push(__sub); continue; } catch (__e${i}) {}`;
      }).join('\n');
      return `(() => {
        const ${ir.arrayCapture}: any[] = [];
        const __entries = Object.entries(__v as Record<string, unknown>);
        for (const [__k, __v] of __entries) {
          const __wrapped = { [__k]: __v };
          ${tries}
          throw new Error('inverse: merge entry not accepted by any role production');
        }
        captures.${ir.arrayCapture} = ${ir.arrayCapture};
      })()`;
    }
    // ... existing cases ...
  }
}
```

(Exact emit shape depends on the existing pattern in `inverse.ts`. The code blocks above are illustrative — when implementing, match the surrounding style for declaring locals, recursing on sub-inverses, and writing into the captures shape.)

- [ ] **Step 4: Add an inverse-direction test**

```typescript
test('flat-json inverse: round-trips Rule + Decl', async () => {
  // Same schema as the forward Rule test above.
  // ...
  const { render, stringify } = await loadV2Parser(code);
  const flat = render('.foo { color: red; font-size: 12px }', { target: 'json' });
  assert.deepEqual(flat, { '.foo': { color: 'red', 'font-size': '12px' } });

  const source = stringify(flat, { target: 'json' });
  assert.equal(source, '.foo { color: red;font-size: 12px}');
  // (Exact whitespace may differ — the assert above is illustrative; what
  // matters is that source re-parses to the same flat value.)

  assert.deepEqual(render(source, { target: 'json' }), flat);
});
```

- [ ] **Step 5: Test passes**

Run, expect pass.

- [ ] **Step 6: Commit**

```bash
git add packages/compiler/src/model.ts packages/compiler/src/infer/invert.ts packages/compiler/src/emit/inverse.ts packages/compiler/src/emit/rebuild.ts packages/compiler/test/flat-json.test.ts
git commit -m "feat(compiler): derive + emit inverse for dynKey + merge bodies"
```

---

## Task 4: Wire CSS schema

**Files:**
- Modify: `packages/css/src/schema.ts` — declare `json:` bodies using the new builders
- Modify: `packages/parser/test/generated-parser-ir.golden.json` — refresh css hash

- [ ] **Step 1: Add new imports**

```typescript
import { $, defineSchema, defineValidation, dynKey, literal, merge, parse, relation, span, tpl } from "@parser2/parser";
```

- [ ] **Step 2: Add `json:` bodies**

```typescript
// Comment: dropped from json output
json: null,

// Declaration with !important: dropped (no important slot in flat shape)
json: null,

// Declaration plain:
json: dynKey($.prop, $.value),

// Rule:
json: dynKey($.selector, merge($.nodes)),

// AtRule block + statement: dropped
json: null,

// Stylesheet:
json: merge($.nodes),
```

- [ ] **Step 3: Regenerate, bump hash, run tests**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run generate 2>&1 | tail -5
shasum -a 256 packages/css/src/_generated/parser.ts
# Update css hash in packages/parser/test/generated-parser-ir.golden.json
npm test 2>&1 | grep -E '^# (tests|pass|fail)' | head -20
```

- [ ] **Step 4: End-to-end demo**

```bash
cd packages/css && npx tsc -b
cat > /tmp/demo.mjs << 'EOF'
import { render, stringify } from './dist/index.js';
const json = render('.foo { color: red }', { target: 'json' });
console.log('flat:', JSON.stringify(json));            // { ".foo": { "color": "red" } }
console.log('back:', stringify(json, { target: 'json' })); // .foo { color: red; }
EOF
node /tmp/demo.mjs
```

- [ ] **Step 5: Commit**

```bash
git add packages/css/src/schema.ts packages/css/src/_generated/parser.ts packages/parser/test/generated-parser-ir.golden.json
git commit -m "feat(css): flat json target — { selector: { prop: value } } shape, bidirectional"
```

---

## Self-Review

**1. Spec coverage:**
- F1 (dynKey/merge DSL) → Task 1.
- F2 (forward emit) → Task 2.
- F3 (inverse + bidirectional) → Task 3.
- F4 (CSS schema wiring + round-trip demo) → Task 4.

**2. Placeholder scan:**
- Task 3 Step 3's emit code blocks are marked "illustrative — match the surrounding style" because the exact local-variable names and capture-write shape vary across the existing `emitInverseIRBody` cases. When implementing, the engineer reads the neighboring cases and matches their convention. This is a real instruction, not a placeholder.

**3. Type consistency:**
- `DynKeyBody`, `MergeBody`, `dynKey`, `merge`, `isDynKey`, `isMerge` names stable across tasks.
- `InverseIR.kind === 'dynKey'` and `'merge'` consistent in model + invert + inverse emit.
- The "per-production inverse" list ordering matches declaration order, the same convention the existing inverse derivation uses for ordinary roles.

**4. Risk flags:**
- The "skip these productions in the flat shape" mechanism (`json: null`) relies on the existing `body === null` early-exit in the captures-path render and on `merge`'s filter at runtime. If a future test feeds a flat input containing keys that match `null`-bodied productions, the inverse would have no production to dispatch to and throws. Acceptable per the user's "skip comments + at-rules" decision.
- Two declarations with the same `prop` in source CSS → last-wins (Object.assign semantics). Documented as a known lossy shape.
- The flat shape can't represent multiple `;` separators or whitespace style — the source target carries those.
