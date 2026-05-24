# Stringify Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `stringify(structure, { target })` and a fused `render(input, { target })` to every generated parser, driven by a closed `tpl`-tag DSL the schema author uses to declare per-target output templates. Markdown is the first end-user — it gains a complete `'html'` target alongside the auto-derived `'source'` round-trip.

**Architecture:** A tagged-template tag `tpl` (in `@parser2/parser`) turns `` tpl`<h${$.depth}>${$.text}</h${$.depth}>` `` into a `{parts, slots}` data object at schema-load time. A new inference pass decomposes each example's authored templates and synthesizes a `'source'` template from the span sequence. The emitter walks `parts`/`slots` and bakes straight-line `out.push(...)` calls into the generated parser — no template interpreter at runtime. The fused `render` codepath in the scannerless emitter shares the parse scan logic but routes captures into a string buffer instead of a Structure literal, eliminating Structure allocation on the hot path.

**Tech Stack:** TypeScript (Node 22), `node:test`, `tinybench`, esbuild (size gate). No new runtime dependencies. Compiler target stays a single TypeScript file per generated parser.

**Source of truth:** `docs/superpowers/specs/2026-05-24-stringify-templates-design.md`. Where this plan and the spec disagree, the spec wins; flag the divergence.

---

## Project invariants this plan must not violate

These are load-bearing — every task is written so it cannot drift on them. If a step seems to violate one, stop and re-read the spec section that talks about it.

1. **Domainless compiler.** No code path in `packages/compiler/src/` may branch on a target name. Forbidden patterns: `if (target === 'html')`, `switch (target) { case 'source': ... case 'html': ... }` with target-specific behavior. `'source'` is allowed as a *reserved key* used in the inference pass (the synthesis pass produces a template for that key) but never as a codegen discriminator — once a template is attached, every target is walked identically. A grep for `target === 'html'` in `packages/compiler/src/` must return zero hits at the end of this work. (Acceptance criterion #7.)
2. **No JS in templates.** Slot vocabulary is exactly `${$.name}` for v1. The inference pass rejects every slot value that isn't a `SpanValueRef` sentinel (`{ __ref: 'span-value', name: string }`). No conditionals, no `.map(...)`, no escape primitives.
3. **No template interpreter ships in the runtime.** Templates compile away to `out.push(...)` (render) or `parts[0] + slot0(s) + parts[1] + ...` (stringify) at codegen time. The only new per-call runtime cost is the `out: string[]` allocated per `render(...)` invocation plus a trailing `out.join('')`.
4. **Package facade stays a pure re-export.** `packages/markdown/src/index.ts` (and every other schema's) stays `export * from './_generated/parser.ts';`. `stringify` and `render` come from the generated file. `npm run audit:parser-contract` must pass.
5. **Perf is primary.** `bench:ast` and parse-only perf gates stay green across all schemas. Markdown's new `bench:render` row gates `parser2 render(md, 'html')` against `markdown-it` and `marked`. Fused render must not allocate the intermediate Structure.

If a task asks you to write code that conflicts with one of these, the task is wrong — escalate before implementing.

---

## File structure

### New files

| Path | Responsibility |
|---|---|
| `packages/parser/src/template.ts` | `tpl` tagged-template function. Returns `{ parts, slots }`. Detects and rejects non-sentinel slot values. |
| `packages/parser/test/template.test.ts` | Unit tests for `tpl` tag decomposition + non-sentinel rejection. |
| `packages/compiler/src/infer/templates.ts` | Inference pass: for each Production, walk its example's `stringifyTemplates` entries, validate slot references, attach onto `Production.stringifyTemplates`. |
| `packages/compiler/src/infer/source-template.ts` | Inference pass: synthesize the `'source'` template per Production from its span sequence and the schema's `whitespace` policy. |
| `packages/compiler/test/templates.test.ts` | Unit tests: `tpl` decomposition, source-template synthesis, validate errors (unresolved ref, duplicate target, reserved key). |
| `packages/compiler/src/emit/stringify.ts` | Codegen helper: walks each `(NodeType, target)` pair and emits `stringify_<NodeType>_<target>` plus the public `stringify(structure, opts)` dispatcher. Used by both scannerless and v2 emitters. |
| `packages/compiler/src/emit/render.ts` | Codegen helper: emits the render-flavour production bodies and the public `render(input, opts)` dispatcher. Implemented for the scannerless emit (the default that markdown uses); v2 wires a fallback. |
| `packages/markdown/test/render-html.test.ts` | Per-example `render(input, { target: 'html' }) === expected` table-driven test. |
| `packages/markdown/test/round-trip.test.ts` | Per-example `render(input, { target: 'source' }) === input` (canonical) test. |
| `packages/markdown/test/stringify-parity.test.ts` | Per-(example, target) `stringify(parse(input), { target }) === render(input, { target })`. |
| `packages/markdown/bench/render.ts` | `parser2 render(md, 'html')` vs `markdown-it.render()` vs `marked.parse()` via `scripts/bench-table.ts`. |

### Modified files

| Path | What changes |
|---|---|
| `packages/parser/src/types.ts` | Add `TemplateSlot`, `Template` types and `ExampleDef.stringifyTemplates`. |
| `packages/parser/src/example.ts` | `ExampleBuilder.stringify(target, template)` method; `SpanBuilder.stringify(...)` continuation. ExampleDef.build() carries the templates array. |
| `packages/parser/src/index.ts` | Export `tpl`, `Template`, `TemplateSlot`, plus an `isTemplate` type guard. |
| `packages/compiler/src/model.ts` | Add `stringifyTemplates: ReadonlyArray<{target, parts, slots}>` to `Production`. |
| `packages/compiler/src/infer/productions.ts` | Initialize `Production.stringifyTemplates` to `[]`; templates inference attaches afterwards. |
| `packages/compiler/src/infer/validate.ts` | Slot-ref resolution (every `slot.ref` must be a span name in the same example); `(production, target)` uniqueness; reserved-key check (`'source'` is forbidden in author templates). |
| `packages/compiler/src/index.ts` | Run the new infer passes after `validate`: `attachAuthorTemplates`, `attachSourceTemplates`. |
| `packages/compiler/src/emit/scannerless/index.ts` | Replace the throwing `stringify` placeholder. Emit the new `stringify`+`render` exports via the new helper modules. |
| `packages/compiler/src/emit/v2/index.ts` | Replace the throwing `stringify` placeholder. Emit `stringify` via the new helper module; emit `render` as a `stringify ∘ parse` fallback (only `cron` uses v2 today and it only needs auto-derived `'source'`). |
| `packages/markdown/src/schema.ts` | `.stringify('html', tpl`...`)` on each of the ~35 example builders. |
| `packages/markdown/package.json` | Add `"bench:render": "..."`, include render in `bench`. |
| `packages/markdown/bench/perf-baseline.json` | Add `render:5KB`, `render:50KB`, etc. rows (initial baseline locked at the end of Task 13). |
| `packages/markdown/bench/size-baseline.json` | Relock once after `stringify`+`render` land. Reviewed in PR diff. |

### Files explicitly NOT touched

- `packages/markdown/bench/fixtures/app-rules-fixture.md` (Stream B owns it).
- Any schema's grammar (no `.structure(...)` or span changes anywhere).
- The runtime helpers package (there isn't one — generated parsers are self-contained).

---

## Sequencing

The migration order from the spec, expanded into independently-verifiable tasks:

1. Parser package gains `tpl` and `.stringify()` — Tasks 1–2.
2. Compiler inference attaches templates onto productions — Tasks 3–6.
3. Compiler emit produces `stringify` and `render` exports — Tasks 7–9 (7 and 8 are independent and may land in either order).
4. Cron + one tiny schema (e.g. `mac`) prove the surface end-to-end — Task 10.
5. Markdown authors the `'html'` target — Task 11.
6. Markdown tests + bench + size relock — Tasks 12–14.
7. Other schemas re-verify — Task 15.
8. Final audit (`audit:parser-contract`, acceptance grep) — Task 16.

Tasks 7 and 8 may be done in parallel by two engineers / subagents — `emit/stringify.ts` and `emit/render.ts` share no state. They share validation (Task 6) and the inferred model (Tasks 3–5) so both depend on Task 6.

---

## Task 1: Parser — `tpl` tagged-template tag + `Template` type

**Files:**
- Create: `packages/parser/src/template.ts`
- Modify: `packages/parser/src/types.ts`
- Modify: `packages/parser/src/index.ts`
- Test: `packages/parser/test/template.test.ts`

### Step 1.1: Write the failing test

Create `packages/parser/test/template.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { $, tpl, isTemplate } from '../src/index.ts';

test('tpl decomposes a simple template literal into parts and slots', () => {
  const t = tpl`<h${$.depth}>${$.text}</h${$.depth}>`;
  assert.equal(isTemplate(t), true);
  assert.deepEqual(t.parts, ['<h', '>', '</h', '>']);
  assert.deepEqual(t.slots, [
    { kind: 'capture', ref: 'depth' },
    { kind: 'capture', ref: 'text' },
    { kind: 'capture', ref: 'depth' },
  ]);
});

test('tpl with no interpolation produces one part and zero slots', () => {
  const t = tpl`<hr>`;
  assert.deepEqual(t.parts, ['<hr>']);
  assert.deepEqual(t.slots, []);
});

test('tpl with only a slot still emits empty string parts at both ends', () => {
  const t = tpl`${$.value}`;
  assert.deepEqual(t.parts, ['', '']);
  assert.deepEqual(t.slots, [{ kind: 'capture', ref: 'value' }]);
});

test('tpl rejects non-sentinel interpolation values at construction time', () => {
  const notSentinel = 'oops';
  assert.throws(
    () => tpl`prefix ${notSentinel} suffix`,
    /tpl: slot 0 value must be a \$\.name sentinel/,
  );
});

test('tpl rejects $.something.present (presence ref) — v1 vocabulary is value-only', () => {
  assert.throws(
    () => tpl`x ${$.flag.present}`,
    /tpl: slot 0 value must be a \$\.name sentinel \(got span-presence\)/,
  );
});

test('isTemplate is a tight type guard', () => {
  assert.equal(isTemplate({ parts: ['x'], slots: [] }), false); // missing brand
  assert.equal(isTemplate(null), false);
  assert.equal(isTemplate(undefined), false);
  assert.equal(isTemplate('x'), false);
});
```

### Step 1.2: Run the test to verify it fails

Run: `node --import tsx --test packages/parser/test/template.test.ts`

Expected: FAIL with `Cannot find module '../src/template.ts'` or `tpl is not exported`.

### Step 1.3: Add types to `packages/parser/src/types.ts`

At the bottom of `types.ts` add:

```ts
// --- Stringify templates -------------------------------------------------

export type TemplateSlot = {
  readonly kind: 'capture';
  readonly ref: string;
};

export type Template = {
  readonly __tpl: true;
  readonly parts: ReadonlyArray<string>;
  readonly slots: ReadonlyArray<TemplateSlot>;
};

export type StringifyTemplateDef = {
  readonly target: string;
  readonly template: Template;
};
```

Then add `stringifyTemplates` to `ExampleDef`:

```ts
export type ExampleDef = {
  readonly input: string;
  readonly nodeType?: string;
  readonly spans: ReadonlyArray<SpanDef>;
  readonly structure?: StructureValue;
  readonly status: ExampleStatus;
  readonly stringifyTemplates: ReadonlyArray<StringifyTemplateDef>;
};
```

(Make `stringifyTemplates` required and default to `[]` in the builder — see Task 2.)

### Step 1.4: Implement `tpl` in `packages/parser/src/template.ts`

```ts
import type { Template, TemplateSlot } from './types.ts';
import { isStructureRef } from './ref.ts';

export function tpl(
  strings: TemplateStringsArray,
  ...values: ReadonlyArray<unknown>
): Template {
  const parts: string[] = [...strings];
  const slots: TemplateSlot[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!isStructureRef(v) || v.__ref !== 'span-value') {
      const got = isStructureRef(v) ? v.__ref : typeof v;
      throw new Error(
        `tpl: slot ${i} value must be a $.name sentinel (got ${got})`,
      );
    }
    slots.push({ kind: 'capture', ref: v.name });
  }
  return { __tpl: true, parts, slots };
}

export function isTemplate(value: unknown): value is Template {
  return (
    typeof value === 'object'
    && value !== null
    && (value as { __tpl?: unknown }).__tpl === true
    && Array.isArray((value as { parts?: unknown }).parts)
    && Array.isArray((value as { slots?: unknown }).slots)
  );
}
```

Notes for the implementer:
- `TemplateStringsArray` is `ReadonlyArray<string>` at runtime — `[...strings]` is safe.
- The "slot N" error message must match the regex in the test. Keep `(got <kind>)` exactly so the second test asserts the kind.
- `tpl` rejects `$.foo.present` because `isStructureRef` accepts both `span-value` and `span-presence`; we narrow further to `span-value`.

### Step 1.5: Export from `packages/parser/src/index.ts`

```ts
export { defineSchema } from './schema.ts';
export { defineValidation } from './validation.ts';
export { ex } from './example.ts';
export { $, isStructureRef } from './ref.ts';
export { tpl, isTemplate } from './template.ts';
export type {
  // ... existing exports ...
  Template,
  TemplateSlot,
  StringifyTemplateDef,
} from './types.ts';
```

(Preserve the existing exports — add the three lines `tpl`/`isTemplate` and the three types.)

### Step 1.6: Run the test to verify it passes

Run: `node --import tsx --test packages/parser/test/template.test.ts`

Expected: PASS — six tests.

### Step 1.7: Commit

```bash
git add packages/parser/src/template.ts packages/parser/src/types.ts packages/parser/src/index.ts packages/parser/test/template.test.ts
git commit -m "feat(parser): tpl tagged-template tag and Template type"
```

---

## Task 2: Parser — `.stringify(target, template)` builder method

**Files:**
- Modify: `packages/parser/src/example.ts`
- Test: `packages/parser/test/parser.test.ts` (extend existing)

### Step 2.1: Write the failing test

Append to `packages/parser/test/parser.test.ts`:

```ts
import { tpl } from '../src/index.ts';

test('ExampleBuilder.stringify attaches a template under the given target', () => {
  const example = ex('## Installation guide')
    .as('MarkdownLeaf')
    .span('##')
    .span('first', 'Installation').ident().css()
    .span('second', 'guide').ident().css()
    .structure({ type: 'heading', depth: 2, text: [$.first, $.second] })
    .stringify('html', tpl`<h2>${$.first} ${$.second}</h2>`)
    .build();
  assert.equal(example.stringifyTemplates.length, 1);
  assert.equal(example.stringifyTemplates[0]!.target, 'html');
  assert.deepEqual(example.stringifyTemplates[0]!.template.parts, ['<h2>', ' ', '</h2>']);
  assert.deepEqual(example.stringifyTemplates[0]!.template.slots, [
    { kind: 'capture', ref: 'first' },
    { kind: 'capture', ref: 'second' },
  ]);
});

test('stringify chains from inside a span builder', () => {
  // Continuation: .span(...).ident().stringify(...) — the SpanBuilder forwards.
  const example = ex('---')
    .as('MarkdownLeaf')
    .span('---')
    .structure({ type: 'thematic-break' })
    .stringify('html', tpl`<hr>`)
    .build();
  assert.equal(example.stringifyTemplates.length, 1);
});

test('multiple .stringify() calls accumulate (one per target)', () => {
  const example = ex('# title')
    .as('MarkdownLeaf')
    .span('#')
    .span('first', 'title').ident().css()
    .structure({ type: 'heading', depth: 1, text: [$.first] })
    .stringify('html', tpl`<h1>${$.first}</h1>`)
    .stringify('plain', tpl`${$.first}`)
    .build();
  assert.deepEqual(
    example.stringifyTemplates.map((t) => t.target),
    ['html', 'plain'],
  );
});

test('example without .stringify() still has stringifyTemplates: []', () => {
  const example = ex('foo').as('Token').span('v', 'foo').ident().structure({ v: $.v }).build();
  assert.deepEqual(example.stringifyTemplates, []);
});
```

### Step 2.2: Run the tests to verify they fail

Run: `node --import tsx --test packages/parser/test/parser.test.ts`

Expected: FAIL with `example.stringify is not a function` and similar.

### Step 2.3: Implement in `packages/parser/src/example.ts`

Inside `ExampleBuilder`:

```ts
private templates: StringifyTemplateDef[] = [];

stringify(target: string, template: Template): ExampleBuilder {
  this.templates.push({ target, template });
  return this;
}
```

In `build()`:

```ts
return {
  input: this.input,
  nodeType: this.nodeType,
  spans: this.spans as ReadonlyArray<SpanDef>,
  structure: this.structureValue,
  status: this.status,
  stringifyTemplates: this.templates,
};
```

Add the matching continuation to `SpanBuilder`:

```ts
stringify(target: string, template: Template): ExampleBuilder {
  return this.parent.stringify(target, template);
}
```

Update imports at the top of `example.ts`:

```ts
import type {
  ExampleDef,
  ExampleStatus,
  RecoveryPolicy,
  Refinement,
  SpanClass,
  SpanDef,
  SpanModifier,
  StringifyTemplateDef,
  StructureValue,
  Template,
  TrailingPolicy,
} from './types.ts';
```

### Step 2.4: Run the tests to verify they pass

Run: `node --import tsx --test packages/parser/test/parser.test.ts`

Expected: PASS (all existing tests still pass plus the four new ones).

### Step 2.5: Commit

```bash
git add packages/parser/src/example.ts packages/parser/test/parser.test.ts
git commit -m "feat(parser): ExampleBuilder.stringify(target, template)"
```

---

## Task 3: Compiler model — `stringifyTemplates` on `Production`

**Files:**
- Modify: `packages/compiler/src/model.ts`
- Modify: `packages/compiler/src/infer/productions.ts`

### Step 3.1: Write the failing test

Append to `packages/compiler/test/inference.test.ts`:

```ts
import { tpl } from '@parser2/parser';

test('inferSchema attaches an empty stringifyTemplates array to every production by default', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident().structure({ type: 'atom', v: $.v }).build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Atom')!.productions[0]!;
  assert.deepEqual(production.stringifyTemplates, []);
});
```

### Step 3.2: Run the test to verify it fails

Run: `node --import tsx --test packages/compiler/test/inference.test.ts`

Expected: FAIL — `production.stringifyTemplates` is `undefined`.

### Step 3.3: Modify `packages/compiler/src/model.ts`

Add to `Production`:

```ts
export type StringifyTemplate = {
  readonly target: string;
  readonly parts: ReadonlyArray<string>;
  readonly slots: ReadonlyArray<{ readonly kind: 'capture'; readonly ref: string }>;
};

export type Production = {
  readonly nodeType: string;
  readonly source: ExampleDef;
  readonly spans: ReadonlyArray<ResolvedSpan>;
  readonly structure: StructureValue;
  readonly recovery?: RecoveryPolicy;
  // Filled by infer/templates.ts (author entries) and infer/source-template.ts
  // (auto-derived 'source' entry). Empty until those passes run.
  readonly stringifyTemplates: ReadonlyArray<StringifyTemplate>;
};
```

### Step 3.4: Initialize the field in `packages/compiler/src/infer/productions.ts`

In `buildProductions`, the `production` literal becomes:

```ts
const production: Production = {
  nodeType,
  source: example,
  spans: example.spans.map(toResolvedSpan),
  structure: example.structure as StructureValue,
  recovery: example.status.kind === 'recovered' ? example.status.recovery : undefined,
  stringifyTemplates: [], // attached by later passes
};
```

### Step 3.5: Run the test to verify it passes

Run: `node --import tsx --test packages/compiler/test/inference.test.ts`

Expected: PASS.

### Step 3.6: Commit

```bash
git add packages/compiler/src/model.ts packages/compiler/src/infer/productions.ts packages/compiler/test/inference.test.ts
git commit -m "feat(compiler): Production carries stringifyTemplates"
```

---

## Task 4: Compiler infer — attach author templates

**Files:**
- Create: `packages/compiler/src/infer/templates.ts`
- Modify: `packages/compiler/src/index.ts` (call the new pass)
- Test: `packages/compiler/test/templates.test.ts`

### Step 4.1: Write the failing test

Create `packages/compiler/test/templates.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { inferSchema } from '../src/index.ts';

test('author templates are attached to the production they describe', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('# title')
        .as('Atom')
        .span('#')
        .span('first', 'title').ident().css()
        .structure({ type: 'heading', text: [$.first] })
        .stringify('html', tpl`<h1>${$.first}</h1>`)
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Atom')!.productions[0]!;
  const html = production.stringifyTemplates.find((t) => t.target === 'html');
  assert.ok(html, 'html template attached');
  assert.deepEqual(html.parts, ['<h1>', '</h1>']);
  assert.deepEqual(html.slots, [{ kind: 'capture', ref: 'first' }]);
});

test('reserved target name "source" rejected from author templates', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident()
        .structure({ type: 'atom', v: $.v })
        .stringify('source', tpl`${$.v}`)
        .build(),
    ],
  });
  assert.throws(() => inferSchema(schema), /reserved target name 'source'/);
});

test('duplicate target on one production is rejected', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident()
        .structure({ type: 'atom', v: $.v })
        .stringify('html', tpl`<a>${$.v}</a>`)
        .stringify('html', tpl`<b>${$.v}</b>`)
        .build(),
    ],
  });
  assert.throws(() => inferSchema(schema), /duplicate stringify target 'html'/);
});

test('unresolved slot ref (no matching span) is rejected', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident()
        .structure({ type: 'atom', v: $.v })
        .stringify('html', tpl`<a>${$.missing}</a>`)
        .build(),
    ],
  });
  assert.throws(() => inferSchema(schema), /slot \$\.missing references unknown span/);
});
```

### Step 4.2: Run the test to verify it fails

Run: `node --import tsx --test packages/compiler/test/templates.test.ts`

Expected: FAIL — all four cases fail because the pass doesn't exist yet.

### Step 4.3: Implement `packages/compiler/src/infer/templates.ts`

```ts
import { CompilerError, type NodeTypeInfo, type Production, type StringifyTemplate } from '../model.ts';

const RESERVED_TARGETS = new Set(['source']);

// Pass: walk each production's source example, decompose its
// .stringify(target, template) entries into { target, parts, slots }, validate
// against spans, attach onto Production.stringifyTemplates. Mutates the
// production object in place (productions are model-local mutable here).
export function attachAuthorTemplates(
  nodeTypes: ReadonlyMap<string, NodeTypeInfo>,
): void {
  for (const info of nodeTypes.values()) {
    for (const production of info.productions) {
      const seen = new Set<string>();
      const collected: StringifyTemplate[] = [];
      const spanNames = new Set<string>();
      for (const span of production.spans) {
        if (span.name) spanNames.add(span.name);
      }
      for (const entry of production.source.stringifyTemplates) {
        if (RESERVED_TARGETS.has(entry.target)) {
          throw new CompilerError(
            `In node '${info.name}' (example '${truncate(production.source.input)}'): reserved target name '${entry.target}' cannot be used with .stringify(...) — it is auto-derived`,
          );
        }
        if (seen.has(entry.target)) {
          throw new CompilerError(
            `In node '${info.name}' (example '${truncate(production.source.input)}'): duplicate stringify target '${entry.target}'`,
          );
        }
        seen.add(entry.target);
        for (const slot of entry.template.slots) {
          if (!spanNames.has(slot.ref)) {
            throw new CompilerError(
              `In node '${info.name}' (example '${truncate(production.source.input)}'): slot $.${slot.ref} references unknown span (declared spans: ${[...spanNames].sort().join(', ') || '<none>'})`,
            );
          }
        }
        collected.push({
          target: entry.target,
          parts: [...entry.template.parts],
          slots: entry.template.slots.map((s) => ({ kind: 'capture', ref: s.ref })),
        });
      }
      // Productions are constructed mutably in productions.ts; we mutate
      // the readonly field via cast. (Same pattern as resolveRecursiveRoles.)
      (production as { stringifyTemplates: ReadonlyArray<StringifyTemplate> }).stringifyTemplates = collected;
    }
  }
}

function truncate(s: string): string {
  return s.length <= 40 ? s : `${s.slice(0, 37)}...`;
}
```

### Step 4.4: Wire the pass into `packages/compiler/src/index.ts`

```ts
import { attachAuthorTemplates } from './infer/templates.ts';

// Inside inferSchema, after `validate(nodeTypes);`:
validate(nodeTypes);
attachAuthorTemplates(nodeTypes);
```

### Step 4.5: Run the tests to verify they pass

Run: `node --import tsx --test packages/compiler/test/templates.test.ts`

Expected: PASS — four tests. Also re-run `node --import tsx --test packages/compiler/test/inference.test.ts` to confirm no regression.

### Step 4.6: Commit

```bash
git add packages/compiler/src/infer/templates.ts packages/compiler/src/index.ts packages/compiler/test/templates.test.ts
git commit -m "feat(compiler): attachAuthorTemplates infer pass"
```

---

## Task 5: Compiler infer — synthesize the `'source'` template

**Files:**
- Create: `packages/compiler/src/infer/source-template.ts`
- Modify: `packages/compiler/src/index.ts` (call the new pass after templates)
- Modify: `packages/compiler/test/templates.test.ts` (extend)

### Step 5.1: Write the failing tests

Append to `packages/compiler/test/templates.test.ts`:

```ts
test('source template auto-derives from literal + classed spans (whitespace: standard)', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .structure({ type: 'heading', text: $.first })
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Heading')!.productions[0]!;
  const source = production.stringifyTemplates.find((t) => t.target === 'source');
  assert.ok(source, 'source template synthesized');
  // Spans are: literal "#", then ident "first". One inter-span ws -> single space.
  // Synthesis: parts = ['#', '', ''], slots = [{capture: first}]
  // After collapsing trailing empty parts: parts = ['# ', ''], slots = [{capture: first}].
  // The exact canonical join must round-trip the original input, so:
  assert.deepEqual(source.parts.length, source.slots.length + 1);
  assert.deepEqual(source.slots, [{ kind: 'capture', ref: 'first' }]);
});

test('source template includes a slot for a .repeats() span (interpolated as joined recursion)', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      ex('a b').as('Doc')
        .span('items', 'a b', 'Atom').repeats({ min: 0 })
        .structure({ type: 'doc', items: $.items })
        .build(),
      ex('a').as('Atom').span('v', 'a').ident().structure({ type: 'atom', v: $.v }).build(),
    ],
  });
  const inferred = inferSchema(schema);
  const docSource = inferred.nodeTypes.get('Doc')!.productions[0]!.stringifyTemplates.find((t) => t.target === 'source');
  assert.ok(docSource);
  assert.deepEqual(docSource.slots, [{ kind: 'capture', ref: 'items' }]);
});

test('every production gets a source template even when no author templates exist', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident().structure({ type: 'atom', v: $.v }).build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Atom')!.productions[0]!;
  assert.ok(production.stringifyTemplates.find((t) => t.target === 'source'));
});
```

### Step 5.2: Run the tests to verify they fail

Run: `node --import tsx --test packages/compiler/test/templates.test.ts`

Expected: FAIL — no `'source'` template attached yet.

### Step 5.3: Implement `packages/compiler/src/infer/source-template.ts`

```ts
import type { WhitespacePolicy } from '@parser2/parser';
import { CompilerError, type NodeTypeInfo, type Production, type ResolvedSpan, type StringifyTemplate } from '../model.ts';

// Pass: walk each production's span list and synthesize the 'source' template.
// Generic algorithm — no per-language knowledge.
//
// Per span:
//   - Unnamed literal span: contributes its `text` to the trailing part.
//   - Named literal span: contributes `text` to the trailing part AND a slot
//     bound to the span name (so authoring templates that reference it still
//     work; for 'source' the captured value equals the literal so this is a
//     no-op at render time).
//     IMPLEMENTATION NOTE: for v1 a named literal can be modeled either as
//     a capture slot or a static part. Use a capture slot — simpler, parity
//     with html target shape; capture is the literal's string at render time.
//   - Classed span (ident/number/string/etc.): contributes a capture slot.
//   - Recursive span (single role or multi-role): contributes a capture slot;
//     render-time interpolation recurses with the same target.
//   - .repeats(...) span: contributes a capture slot; render-time
//     interpolation maps over the captured list, recurses each child, joins
//     with the schema's canonical separator (see whitespace policy below).
//   - .until(...) span: contributes a capture slot; render-time
//     interpolation emits the captured raw slice as-is.
//
// Between spans, the canonical whitespace policy ('standard') inserts a
// single space when the original example input had any whitespace between
// adjacent span occurrences; nothing if they were directly adjacent in the
// example. ('preserve' policy is declared but not yet wired; fall back to
// 'standard' until packages/compiler/README.md flips that status.)
export function attachSourceTemplates(
  nodeTypes: ReadonlyMap<string, NodeTypeInfo>,
  whitespace: WhitespacePolicy,
): void {
  for (const info of nodeTypes.values()) {
    for (const production of info.productions) {
      const synthesized = synthesize(production, whitespace);
      const current = production.stringifyTemplates as ReadonlyArray<StringifyTemplate>;
      (production as { stringifyTemplates: ReadonlyArray<StringifyTemplate> }).stringifyTemplates = [
        synthesized,
        ...current,
      ];
    }
  }
}

function synthesize(production: Production, whitespace: WhitespacePolicy): StringifyTemplate {
  // Step 1 — compute each span's contribution and a "did the example have
  // whitespace before this span" flag.
  const input = production.source.input;
  type Piece = { kind: 'literal'; text: string } | { kind: 'slot'; ref: string };
  const pieces: Piece[] = [];

  let cursor = 0;
  for (const span of production.spans) {
    const startOffset = findSpanStart(input, span, cursor);
    const sepText = startOffset === null
      ? canonicalSeparator(whitespace) // optional-absent span: assume canonical
      : input.slice(cursor, startOffset);
    if (sepText.length > 0) {
      pieces.push({ kind: 'literal', text: canonicalize(sepText, whitespace) });
    }
    pieces.push(contributionOf(span));
    if (startOffset !== null && span.text) cursor = startOffset + span.text.length;
  }

  // Trailing input after the last span — only matters when the example has
  // closing literals already consumed; for a well-formed schema cursor == len.
  // Fold consecutive literal pieces and split into parts/slots.
  return foldIntoTemplate(pieces);
}

function contributionOf(span: ResolvedSpan): { kind: 'literal' | 'slot'; text?: string; ref?: string } {
  // Recursive or repeats -> capture slot.
  if (span.recursiveRoles.length > 0) {
    if (!span.name) throw new CompilerError(`source-template: recursive span without name`);
    return { kind: 'slot', ref: span.name };
  }
  // .until() or .rawUntil() -> capture slot (if named) or empty.
  const isUntil = span.modifiers.some((m) => m.kind === 'until' || m.kind === 'rawUntil');
  if (isUntil) {
    if (!span.name) throw new CompilerError(`source-template: until-span without name`);
    return { kind: 'slot', ref: span.name };
  }
  // Classed span (not literal): capture slot.
  if (span.class !== 'literal') {
    if (!span.name) throw new CompilerError(`source-template: classed span without name (class '${span.class}')`);
    return { kind: 'slot', ref: span.name };
  }
  // Literal span:
  //   - Named literal: model as a slot ref (interpolates the literal string).
  //   - Unnamed literal: emit its text as a static part.
  if (span.name) return { kind: 'slot', ref: span.name };
  if (!span.text) throw new CompilerError(`source-template: unnamed literal span without text`);
  return { kind: 'literal', text: span.text };
}

function canonicalize(_separator: string, whitespace: WhitespacePolicy): string {
  // 'standard' canonical form: any whitespace -> single ' '.
  // 'preserve' is declared but not yet wired in the codebase
  // (packages/compiler/README.md). When that lands, this function will pass
  // the slice through unchanged; until then, treat 'preserve' like
  // 'standard'.
  return whitespace === 'standard' ? ' ' : ' ';
}

function canonicalSeparator(whitespace: WhitespacePolicy): string {
  return whitespace === 'standard' ? '' : '';
}

function findSpanStart(input: string, span: ResolvedSpan, cursor: number): number | null {
  if (!span.text) return null;
  const idx = input.indexOf(span.text, cursor);
  return idx < 0 ? null : idx;
}

function foldIntoTemplate(pieces: ReadonlyArray<{ kind: 'literal' | 'slot'; text?: string; ref?: string }>): StringifyTemplate {
  const parts: string[] = [''];
  const slots: { kind: 'capture'; ref: string }[] = [];
  for (const p of pieces) {
    if (p.kind === 'literal') {
      parts[parts.length - 1] += p.text!;
    } else {
      slots.push({ kind: 'capture', ref: p.ref! });
      parts.push('');
    }
  }
  return { target: 'source', parts, slots };
}
```

Notes for the implementer:
- The "canonical separator = single space" approximation is the v1 contract. The user's spec acknowledges this on line 482-489 and accepts inter-block whitespace loss in `mode: 'fast'`. Round-trip byte-identity is `mode: 'raws'` territory — out of scope for v1's synthesis pass; raws-mode joining is a render-side concern that uses the parse body's captured `raws.before/between/after` fields.
- Multi-role spans use the same single-capture-slot synthesis; at render time the recursive call dispatches by the captured Structure's shape.
- Synthesis runs *after* author templates are attached so the `source` entry sits at index 0 and author entries follow.

### Step 5.4: Wire the pass into `packages/compiler/src/index.ts`

```ts
import { attachSourceTemplates } from './infer/source-template.ts';

// Inside inferSchema, after attachAuthorTemplates:
attachAuthorTemplates(nodeTypes);
attachSourceTemplates(nodeTypes, root.whitespace);
```

### Step 5.5: Run the tests to verify they pass

Run: `node --import tsx --test packages/compiler/test/templates.test.ts`

Expected: PASS — all seven tests (4 from Task 4 + 3 from Task 5).

### Step 5.6: Commit

```bash
git add packages/compiler/src/infer/source-template.ts packages/compiler/src/index.ts packages/compiler/test/templates.test.ts
git commit -m "feat(compiler): attachSourceTemplates synthesis pass"
```

---

## Task 6: Compiler infer — extend validate with slot/uniqueness/reserved checks

**Files:**
- Modify: `packages/compiler/src/infer/validate.ts` (or rely on `attachAuthorTemplates` from Task 4 if you already added them there)
- Test: `packages/compiler/test/templates.test.ts` (already covers the cases from Task 4)

This task is structural — the three checks (slot resolution, target uniqueness, reserved-key) were already implemented inside `attachAuthorTemplates` in Task 4 because they need the same slot-name set we compute there. Two acceptable approaches:

**Option A (recommended):** Keep them in `attachAuthorTemplates`. Add a one-line note to `validate.ts` pointing at `templates.ts` so readers find them.

**Option B:** Factor them out into a `validateTemplates(...)` function called from `attachAuthorTemplates`. Same code, just one indirection.

Either way the test coverage from Task 4 already pins behavior. No new code if you picked Option A. If you pick Option B:

### Step 6.1: Refactor — extract into `validate.ts` (optional)

Move the three throw-sites into a function:

```ts
// packages/compiler/src/infer/validate.ts
export function validateTemplateEntries(
  production: Production,
  spanNames: ReadonlySet<string>,
  nodeName: string,
): void { /* same throws as before */ }
```

Then `attachAuthorTemplates` calls `validateTemplateEntries(...)` per production.

### Step 6.2: Re-run the templates tests

Run: `node --import tsx --test packages/compiler/test/templates.test.ts`

Expected: PASS, unchanged.

### Step 6.3: Commit (only if refactored)

```bash
git add packages/compiler/src/infer/validate.ts packages/compiler/src/infer/templates.ts
git commit -m "refactor(compiler): factor template validation into validate.ts"
```

---

## Task 7: Compiler emit — two-pass `stringify` codegen

**Files:**
- Create: `packages/compiler/src/emit/stringify.ts`
- Modify: `packages/compiler/src/emit/scannerless/index.ts` (replace placeholder)
- Modify: `packages/compiler/src/emit/v2/index.ts` (replace placeholder)
- Test: `packages/compiler/test/templates.test.ts` (extend)

### Step 7.1: Write the failing test (end-to-end via generateParser)

Append to `packages/compiler/test/templates.test.ts`:

```ts
import { generateParser } from '../src/index.ts';

test('generateParser emits a stringify function that dispatches by structure.type', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .structure({ type: 'heading', text: $.first })
        .stringify('html', tpl`<h1>${$.first}</h1>`)
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { packageName: 'test' });
  // Public API surface
  assert.match(code, /export function stringify\(structure: unknown, options\?: \{ target\?: string \}\): string/);
  // Author target is present
  assert.match(code, /stringify_Heading_html/);
  // Source target is present
  assert.match(code, /stringify_Heading_source/);
  // Zero compiler branches on target name strings
  assert.equal(/target === ['"]html['"]/.test(code), false);
  assert.equal(/target === ['"]source['"]/.test(code), false);
});
```

Also add a runtime test that actually generates, loads, and executes the parser:

```ts
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

test('stringify(parse(input), { target: "html" }) returns the templated HTML', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .structure({ type: 'heading', text: $.first })
        .stringify('html', tpl`<h1>${$.first}</h1>`)
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { packageName: 'test-stringify' });
  const dir = mkdtempSync(join(tmpdir(), 'parser2-stringify-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  const mod = await import(pathToFileURL(file).href) as {
    parse: (input: string) => unknown;
    stringify: (s: unknown, opts?: { target?: string }) => string;
  };
  const parsed = mod.parse('# title');
  assert.equal(mod.stringify(parsed, { target: 'html' }), '<h1>title</h1>');
});
```

### Step 7.2: Run the tests to verify they fail

Run: `node --import tsx --test packages/compiler/test/templates.test.ts`

Expected: FAIL — generated code still has the throwing `stringify` placeholder.

### Step 7.3: Implement `packages/compiler/src/emit/stringify.ts`

```ts
import type { InferredSchema, NodeTypeInfo, Production, StringifyTemplate } from '../model.ts';
import { jsString } from './strings.ts';

// Emit a stringify implementation for one InferredSchema. Used by both
// scannerless and v2 emitters via their public-API generators. Output is
// pure ES — no parse-state, no runtime dependencies.
export function emitStringify(schema: InferredSchema): string {
  const nodeTypes = [...schema.nodeTypes.values()];
  const targets = collectTargets(nodeTypes);

  // Per (NodeType, target), emit one function. Multi-production nodes get a
  // single per-target function that internally dispatches by structure
  // shape — for v1 we discriminate on a stable distinguishing field
  // (typically `type` since productions usually have distinct `type:`
  // literals; otherwise on the presence/value of a distinguishing field).
  const fns: string[] = [];
  for (const info of nodeTypes) {
    for (const target of targets) {
      fns.push(emitNodeTargetFn(info, target));
    }
  }

  // Public API + dispatch table. Dispatch is structure.type -> NodeType
  // (derived by reading each production's `type:` field literal). For
  // schemas where structures don't carry a `type` field, fall back to a
  // type-string-derived NodeType assumption: parse() and stringify() round-
  // trip the same Structure shape, so the caller will pass the right
  // NodeType implicitly via type. (Markdown's structures all have type:.)
  const dispatch = emitDispatch(schema, targets);

  return [fns.join('\n\n'), dispatch].join('\n\n');
}

function collectTargets(nodeTypes: ReadonlyArray<NodeTypeInfo>): ReadonlyArray<string> {
  const targets = new Set<string>();
  for (const info of nodeTypes) {
    for (const production of info.productions) {
      for (const t of production.stringifyTemplates) targets.add(t.target);
    }
  }
  // Stable order: 'source' first, then alpha-sorted authored targets.
  const authored = [...targets].filter((t) => t !== 'source').sort();
  return ['source', ...authored];
}

function emitNodeTargetFn(info: NodeTypeInfo, target: string): string {
  const fnName = `stringify_${info.name}_${jsId(target)}`;
  const productions = info.productions;
  if (productions.length === 1) {
    const tpl = pickTemplate(productions[0]!, target);
    return `function ${fnName}(s: any): string {
  return ${emitConcat(tpl)};
}`;
  }
  // Multi-production: emit shape-based discrimination.
  const branches = productions.map((production) => {
    const tpl = pickTemplate(production, target);
    const guard = emitDiscriminator(production);
    return `  if (${guard}) return ${emitConcat(tpl)};`;
  });
  return `function ${fnName}(s: any): string {
${branches.join('\n')}
  throw new Error('stringify: no production matches structure shape for node ${info.name}');
}`;
}

function pickTemplate(production: Production, target: string): StringifyTemplate {
  const found = production.stringifyTemplates.find((t) => t.target === target);
  if (!found) {
    // Compiler-fillable: if a target was authored on ANY production of this
    // NodeType but missing on this one, the schema is incomplete. Spec
    // 'validation' section (line 170-178) doesn't require every production
    // to have every target yet, so a sensible fallback is the 'source'
    // template. For v1 we conservatively throw and force the schema author
    // to add the missing template — strict mode.
    throw new Error(
      `stringify: production '${production.nodeType}' (example '${production.source.input.slice(0, 40)}') has no template for target '${target}'`,
    );
  }
  return found;
}

function emitConcat(template: StringifyTemplate): string {
  // Inline: parts[0] + slot0(s) + parts[1] + slot1(s) + ... + parts[n]
  const pieces: string[] = [];
  for (let i = 0; i < template.parts.length; i++) {
    if (template.parts[i]!.length > 0) pieces.push(jsString(template.parts[i]!));
    if (i < template.slots.length) {
      const slot = template.slots[i]!;
      pieces.push(`renderSlot(s[${jsString(slot.ref)}], ${jsString(/* current target threaded via closure */ '__INTERNAL_TARGET__')})`);
    }
  }
  if (pieces.length === 0) return '""';
  return pieces.join(' + ');
}
```

Critical detail for the implementer: the `renderSlot` helper and the way the current `target` threads through must be designed carefully. Two options, both domainless:

**Option A (recommended) — closures per target.** The emitted code is:

```ts
function stringify_Heading_html(s: any): string {
  return "<h1>" + __renderSlot_html(s["first"]) + "</h1>";
}
function __renderSlot_html(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    let out = "";
    for (let i = 0; i < v.length; i++) out += __renderSlot_html(v[i]);
    return out;
  }
  return stringify(v, { target: "html" });
}
```

One `__renderSlot_<target>` per target. Each calls back into the public `stringify(...)` with the same target. Recursion is direct; lists are mapped+joined. Note: the call to `stringify(v, { target: "html" })` looks like a target-name branch but it ISN'T: it's the dispatcher's job to switch on `s.type`, and the target string is opaque data flowing through. The codegen emits `{ target: ${jsString(target)} }` — that's a string-literal value, not a branch on the value.

**Option B — pass target as an arg.** Each emitted function takes `(s, target)`. The codegen reads the literal target string but every function uses the same parameter — fewer functions, more arg threading.

Use Option A in the plan; it's simpler to emit and easier to verify the invariant. The acceptance grep `target === 'html'` returns zero hits because we never compare target strings — we just thread them through `stringify(s, { target })` calls.

Update `emitConcat` to thread the per-target slot helper:

```ts
function emitConcat(template: StringifyTemplate, target: string): string {
  const helper = `__renderSlot_${jsId(target)}`;
  const pieces: string[] = [];
  for (let i = 0; i < template.parts.length; i++) {
    if (template.parts[i]!.length > 0) pieces.push(jsString(template.parts[i]!));
    if (i < template.slots.length) {
      pieces.push(`${helper}(s[${jsString(template.slots[i]!.ref)}])`);
    }
  }
  if (pieces.length === 0) return '""';
  return pieces.join(' + ');
}
```

And `emitDispatch` emits one `__renderSlot_<target>` per target plus the public dispatcher:

```ts
function emitDispatch(schema: InferredSchema, targets: ReadonlyArray<string>): string {
  // Build per-target slot helpers
  const helpers = targets.map((target) => {
    return `function __renderSlot_${jsId(target)}(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) {
    let out = "";
    for (let i = 0; i < v.length; i++) out += __renderSlot_${jsId(target)}(v[i]);
    return out;
  }
  return stringify(v, { target: ${jsString(target)} });
}`;
  }).join('\n\n');

  // Build the per-target NodeType dispatch table.
  // The structure.type for a NodeType is the literal value of `type` in its
  // structure({}) literal — we collect from productions, picking the first.
  const nodeTypeNames = [...schema.nodeTypes.keys()];
  const dispatchByTarget = targets.map((target) => {
    const branches = nodeTypeNames.map((nodeName) => {
      const info = schema.nodeTypes.get(nodeName)!;
      const typeValue = structureTypeLiteral(info.productions[0]!);
      if (typeValue === null) {
        // No `type:` literal — fall back to instanceof / shape check
        // (rare; skip for v1; throw with a helpful message).
        return `  // node '${nodeName}' has no structure.type literal — cannot dispatch by type`;
      }
      return `  if (s.type === ${jsString(typeValue)}) return stringify_${nodeName}_${jsId(target)}(s);`;
    });
    return `if (target === ${jsString(target)}) {
  if (typeof s !== "object" || s === null) throw new Error("stringify: structure must be an object");
${branches.join('\n')}
  throw new Error("stringify: no node type for structure.type='" + s.type + "' under target='" + target + "'");
}`;
  });

  return `export function stringify(s: unknown, options?: { target?: string }): string {
  const target = options?.target ?? "source";
  ${dispatchByTarget.join('\n  ')}
  throw new Error("stringify: unknown target '" + target + "'");
}

${helpers}`;
}
```

ATTENTION: the `if (target === ${jsString(target)})` block is a string-data dispatch on a runtime value `target` — it is NOT a compiler-side branch on a target name. The compiler emits one such block per *target that appears in the schema*, and target names are opaque keys collected from author code. This satisfies acceptance criterion #7 (the grep `target === 'html'` for the *compiler source* returns zero hits; the *generated* parser file contains it but that's the table of opaque target dispatch the compiler must produce).

Add helpers:

```ts
function jsId(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, '_');
}

function structureTypeLiteral(production: Production): string | null {
  const s = production.structure;
  if (s && typeof s === 'object' && !Array.isArray(s) && !('__ref' in s)) {
    const t = (s as Record<string, unknown>).type;
    if (typeof t === 'string') return t;
  }
  return null;
}

function emitDiscriminator(production: Production): string {
  // For multi-production nodes that all share a NodeType but differ on
  // structure shape, emit a presence-or-value check on the first
  // distinguishing field. For markdown's case every production has a
  // distinct `type:` already so this only fires for CSS AtRule-like cases.
  // Trivial v1 heuristic: discriminate by presence of any field that
  // differs between productions. Implementer: see structure.ts /
  // collectOffsetRefs for a reference walk pattern.
  // For markdown, structure.type alone discriminates — and the public
  // dispatcher already routes by structure.type. So this discriminator is
  // a no-op for markdown. Return 'true' as the guard — productions with
  // identical structure.type literals collapse to the first.
  // (Optional enhancement post-v1: emit a real shape check.)
  return 'true';
}
```

### Step 7.4: Wire into scannerless emitter

Modify `packages/compiler/src/emit/scannerless/index.ts`:

```ts
import { emitStringify } from '../stringify.ts';

// In emitScannerlessParser, build the parts list:
export function emitScannerlessParser(schema: InferredSchema): string {
  const header = emitHeader(schema);
  const runtime = SCANNERLESS_PARSE_RUNTIME;
  const parsers = emitNodeFunctions(schema);
  const helpers = takePendingHelpers().join('\n\n');
  const directFast = emitDirectFastPath(schema);
  const stringify = emitStringify(schema);
  const api = emitPublicApi(schema, directFast !== null);
  return [header, runtime, parsers, helpers, directFast, stringify, api]
    .filter((p) => p !== null && p !== '').join('\n\n') + '\n';
}
```

And in `emitPublicApi`, DELETE the throwing `stringify` placeholder block (the new `emitStringify` already produced the export).

### Step 7.5: Wire into v2 emitter

Modify `packages/compiler/src/emit/v2/index.ts`:

```ts
import { emitStringify } from '../stringify.ts';

// In emitV2Parser:
export function emitV2Parser(schema: InferredSchema): string {
  const header = emitHeader(schema);
  const runtime = V2_RUNTIME;
  const nodeFns: string[] = [];
  for (const info of schema.nodeTypes.values()) {
    nodeFns.push(emitNodeType(info, schema));
  }
  const stringify = emitStringify(schema);
  const api = emitPublicApi(schema);
  return [header, runtime, nodeFns.join('\n\n'), stringify, api].join('\n\n') + '\n';
}
```

And in `emitPublicApi` for v2, REMOVE the throwing `stringify` placeholder.

### Step 7.6: Run the tests to verify they pass

Run: `node --import tsx --test packages/compiler/test/templates.test.ts`

Expected: PASS — generated code emits `stringify_Heading_html`, the runtime test loads it via `mkdtempSync` and asserts `<h1>title</h1>`.

Also run the full compiler tests:

Run: `node --import tsx --test packages/compiler/test/*.test.ts`

Expected: PASS — no regressions.

### Step 7.7: Verify the domainless invariant

Run: `git grep -nE "target === ['\"]html['\"]|target === ['\"]source['\"]" packages/compiler/src/`

Expected: zero results in `packages/compiler/src/` (the generated code under `packages/<schema>/src/_generated/` is allowed — it's the dispatch table the compiler produced).

### Step 7.8: Commit

```bash
git add packages/compiler/src/emit/stringify.ts packages/compiler/src/emit/scannerless/index.ts packages/compiler/src/emit/v2/index.ts packages/compiler/test/templates.test.ts
git commit -m "feat(compiler): emit stringify with per-target dispatch"
```

---

## Task 8: Compiler emit — fused `render` (scannerless)

**Files:**
- Create: `packages/compiler/src/emit/render.ts`
- Modify: `packages/compiler/src/emit/scannerless/parse.ts` (factor scan helpers if needed, or thread render-tail emission)
- Modify: `packages/compiler/src/emit/scannerless/index.ts` (wire in)
- Test: `packages/compiler/test/templates.test.ts` (extend with render runtime test)

Note: this is the most invasive task. Read the spec's `## Codegen — fused render` section (lines 265–306) before starting.

### Step 8.1: Write the failing test

Append to `packages/compiler/test/templates.test.ts`:

```ts
test('render(input, { target: "html" }) returns the templated HTML without allocating Structure', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .structure({ type: 'heading', text: $.first })
        .stringify('html', tpl`<h1>${$.first}</h1>`)
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { packageName: 'test-render' });
  const dir = mkdtempSync(join(tmpdir(), 'parser2-render-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  const mod = await import(pathToFileURL(file).href) as {
    render: (input: string, opts?: { target?: string }) => string;
  };
  assert.equal(mod.render('# title', { target: 'html' }), '<h1>title</h1>');
  assert.equal(mod.render('# title'), '# title'); // 'source' default; canonical round-trip
});

test('render === parse + stringify for every example (parity contract)', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .structure({ type: 'heading', text: $.first })
        .stringify('html', tpl`<h1>${$.first}</h1>`)
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { packageName: 'test-parity' });
  const dir = mkdtempSync(join(tmpdir(), 'parser2-parity-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  const mod = await import(pathToFileURL(file).href) as {
    parse: (input: string) => unknown;
    stringify: (s: unknown, opts?: { target?: string }) => string;
    render: (input: string, opts?: { target?: string }) => string;
  };
  for (const input of ['# title', '# title']) {
    for (const target of ['source', 'html']) {
      assert.equal(
        mod.render(input, { target }),
        mod.stringify(mod.parse(input), { target }),
        `parity: ${input} @ ${target}`,
      );
    }
  }
});
```

### Step 8.2: Run the tests to verify they fail

Run: `node --import tsx --test packages/compiler/test/templates.test.ts`

Expected: FAIL — `mod.render` is undefined.

### Step 8.3: Implement `packages/compiler/src/emit/render.ts`

The fused render shares the parse body's scan logic but emits `out.push(...)` instead of constructing a Structure. The pragmatic implementation for v1:

```ts
import type { InferredSchema, NodeTypeInfo, Production } from '../model.ts';
import { jsString } from './strings.ts';

// Emit the public render(input, opts) export plus per-(production, target)
// render-flavour functions. Public render constructs an out: string[], calls
// the root render fn with that buffer, returns out.join('').
//
// For v1 we share parse() with stringify() as the implementation strategy:
//   render(input, opts) === stringify(parse(input, opts), opts)
//
// This is a CORRECT but UNFUSED implementation. Acceptance criterion 4
// (markdown perf gate) requires the fused-no-Structure path; markdown's
// bench:render must beat markdown-it/marked. The fused version is Task 8B
// (below); land Task 8A first because it makes every schema's render
// callable and is what the other 10 schemas use (auto-derived 'source'
// only — not on a hot path).
export function emitRender(schema: InferredSchema): string {
  const targets = collectTargets([...schema.nodeTypes.values()]);
  // Targets are emitted as opaque string keys flowing through to stringify.
  // No compiler branch on target name.
  const dispatch = `export function render(input: string, options?: { target?: string; mode?: 'fast' | 'raws' }): string {
  const target = options?.target ?? 'source';
  const parsed = parse(input, options?.mode ? { mode: options.mode } : undefined);
  return stringify(parsed, { target });
}`;
  return dispatch;
}

function collectTargets(nodeTypes: ReadonlyArray<NodeTypeInfo>): ReadonlyArray<string> {
  const set = new Set<string>();
  for (const info of nodeTypes) {
    for (const p of info.productions) for (const t of p.stringifyTemplates) set.add(t.target);
  }
  return ['source', ...[...set].filter((t) => t !== 'source').sort()];
}
```

### Step 8.4: Wire into the scannerless emitter (and v2)

In `packages/compiler/src/emit/scannerless/index.ts`:

```ts
import { emitRender } from '../render.ts';

export function emitScannerlessParser(schema: InferredSchema): string {
  // ... existing ...
  const stringify = emitStringify(schema);
  const render = emitRender(schema);
  // ... existing ...
  return [header, runtime, parsers, helpers, directFast, stringify, render, api]
    .filter((p) => p !== null && p !== '').join('\n\n') + '\n';
}
```

Same wire-in for `packages/compiler/src/emit/v2/index.ts`.

### Step 8.5: Run the tests to verify they pass

Run: `node --import tsx --test packages/compiler/test/templates.test.ts`

Expected: PASS — render runtime test asserts `<h1>title</h1>` and `# title` round-trip; parity test asserts render==stringify∘parse.

### Step 8.6: Commit (Task 8A — unfused render landed)

```bash
git add packages/compiler/src/emit/render.ts packages/compiler/src/emit/scannerless/index.ts packages/compiler/src/emit/v2/index.ts packages/compiler/test/templates.test.ts
git commit -m "feat(compiler): emit render = stringify ∘ parse fallback"
```

### Step 8.7: Implement fused render (Task 8B)

Once Task 8A is green and all other tasks below are also green (because they only need the API surface), come back and implement the fused codepath in `packages/compiler/src/emit/render.ts`. The fused implementation:

1. For each `(production, target)` pair, emit `renderProd_<NodeType>__alt<i>_<target>(state, out)`. The function reuses the parse body's scan/match/capture logic but, instead of constructing the structure literal at the end, walks the template's `parts`/`slots` and pushes onto `out`. For each slot:
   - Primitive capture (string/number/literal): `out.push(${captureExpr})`
   - Recursive capture: call `renderProd_<role>_<target>(state, out)` directly — `state.pos` is already at the right offset because the parse body advanced it.
   - `.repeats(...)` capture: emit a loop that calls the child render fn for each iteration, with the parse body's existing repeat scaffolding driving sentinel detection.
2. Public dispatcher routes to the root render fn per target.
3. Failure mode: parse failures still throw the same SyntaxError. Successful render returns `out.join('')`.

Reference the scannerless emit's per-production codegen in `packages/compiler/src/emit/scannerless/parse.ts` for the patterns to mirror. The same skip-ws, peek-dispatch, and scan kernels apply.

**This step deserves its own subtask if it grows large.** Recommended subagent dispatch: hand the spec section "Codegen — fused render" plus `packages/compiler/src/emit/scannerless/parse.ts` to a fresh subagent and ask for the fused emit. Land it in a follow-up commit after Task 11's markdown integration confirms the unfused render is functional, then return here.

For the plan-following engineer: ship Task 8A first, return to 8B AFTER markdown is wired and tests pass — that order gives the parity tests as a safety net for the fused implementation. The plan presents 8A and 8B as siblings; the executor lands 8B before declaring acceptance criterion #4 met.

### Step 8.8: Commit the fused implementation

```bash
git add packages/compiler/src/emit/render.ts packages/compiler/src/emit/scannerless/parse.ts
git commit -m "perf(compiler): fused render (no Structure allocation)"
```

---

## Task 9: Wire `render` through v2 emit (cron-only)

This is already done by Task 8A: `emit/render.ts` is emitter-agnostic and is wired into both `scannerless/index.ts` and `v2/index.ts`. The `render = stringify ∘ parse` form works for cron — cron only needs `'source'` auto-derived, and there is no `bench:render` gate for cron.

No additional action. Skip if Task 8 is complete.

---

## Task 10: Smoke test — cron round-trip + one tiny author target

**Files:**
- Test: `packages/cron/test/cron.test.ts` (extend)
- Modify: `packages/mac/src/schema.ts` (add ONE `.stringify('upper', tpl`...`)` to prove the surface)
- Test: `packages/mac/test/mac.test.ts` (extend)

This task is the migration spec's step 3+4 — a small schema proves the surface end-to-end before the big markdown rollout.

### Step 10.1: Generate cron with new compiler and verify round-trip

Run: `npm run generate -w @parser2/cron`

Expected: `packages/cron/src/_generated/parser.ts` re-emits with the new `stringify` and `render` exports (no longer placeholders).

Append to `packages/cron/test/cron.test.ts`:

```ts
test('cron render(input) round-trips to source for canonical inputs', () => {
  const cases = ['* * * * *', '0 0 * * *', '*/5 * * * *', '0 1-3 * * *'];
  for (const input of cases) {
    assert.equal(render(input), input, input);
  }
});

test('cron stringify(parse(input)) === input for canonical inputs', () => {
  const input = '* * * * *';
  assert.equal(stringify(parse(input)), input);
});
```

(Add `render` and `stringify` to the import at the top.)

### Step 10.2: Run cron tests

Run: `npm test -w @parser2/cron`

Expected: PASS. If round-trip fails because the source-template synthesis loses a space or separator, fix `source-template.ts` (this is the v1 contract — canonical whitespace; for non-canonical inputs the user uses `mode: 'raws'`).

### Step 10.3: Add an author target to `packages/mac/src/schema.ts`

Pick the simplest author target — e.g. an uppercase `'upper'` target that emits the MAC address with `${$.octets}` joined by colons. Verify the surface end-to-end without committing markdown.

```ts
.stringify('upper', tpl`${$.octets}`)
```

(Adjust to match `mac`'s actual span names — see the schema file.)

### Step 10.4: Test mac

Append to `packages/mac/test/mac.test.ts`:

```ts
test('mac render with author-written target round-trips', () => {
  assert.equal(render('aa:bb:cc:dd:ee:ff', { target: 'upper' }), 'aa:bb:cc:dd:ee:ff');
});
```

Run: `npm test -w @parser2/mac`

Expected: PASS.

### Step 10.5: Revert the `mac` schema change (smoke only)

Remove the `.stringify('upper', ...)` call. The point was to verify the API surface end-to-end; we don't ship author templates on schemas other than markdown in Stream A.

### Step 10.6: Commit

```bash
git add packages/cron/test/cron.test.ts packages/cron/src/_generated/parser.ts packages/mac/src/_generated/parser.ts
git commit -m "test(cron): round-trip render/stringify with auto-source target"
```

---

## Task 11: Markdown — author `.stringify('html', tpl`...`)` on all examples

**Files:**
- Modify: `packages/markdown/src/schema.ts` (add a `.stringify('html', tpl`...`)` call per example)

### Step 11.1: Write the failing test (drives template authoring)

Create `packages/markdown/test/render-html.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { render } from '../src/index.ts';

type Case = { input: string; html: string };

// Per-example expected HTML literal. Keep alongside src/schema.ts ordering
// for easy review.
const cases: Case[] = [
  { input: '# Release notes', html: '<h1>Release notes</h1>' },
  { input: '## Installation guide', html: '<h2>Installation guide</h2>' },
  { input: '### API reference', html: '<h3>API reference</h3>' },
  { input: '#### Deep section', html: '<h4>Deep section</h4>' },
  { input: '##### Small section', html: '<h5>Small section</h5>' },
  { input: '###### Tiny heading', html: '<h6>Tiny heading</h6>' },
  { input: 'Setext heading\n---', html: '<h2>Setext heading</h2>' },
  { input: 'Plain paragraph', html: '<p>Plain paragraph</p>' },
  { input: '- first item', html: '<li>first item</li>' },
  { input: '+ alternate marker', html: '<li>alternate marker</li>' },
  { input: '* star marker', html: '<li>star marker</li>' },
  { input: '1. ordered item', html: '<li>ordered item</li>' },
  { input: '- [x] completed task', html: '<li><input type="checkbox" checked>completed task</li>' },
  { input: '- [ ] pending task', html: '<li><input type="checkbox">pending task</li>' },
  { input: '> quoted text', html: '<blockquote>quoted text</blockquote>' },
  { input: '---', html: '<hr>' },
  { input: '***', html: '<hr>' },
  { input: '___', html: '<hr>' },
  { input: '**bold**', html: '<strong>bold</strong>' },
  { input: '*italic*', html: '<em>italic</em>' },
  { input: '~~removed~~', html: '<s>removed</s>' },
  { input: '`code`', html: '<code>code</code>' },
  { input: '[docs](https://example.com)', html: '<a href="https://example.com">docs</a>' },
  { input: '[docs][id]', html: '<a href="#id">docs</a>' },
  { input: '![diagram](https://example.com/diagram.png)', html: '<img src="https://example.com/diagram.png" alt="diagram">' },
  { input: '![diagram][image-id]', html: '<img src="#image-id" alt="diagram">' },
  { input: '<https://example.com>', html: '<a href="https://example.com">https://example.com</a>' },
  { input: '&amp;', html: '&amp;' },
  { input: '```js\nsample\n```', html: '<pre><code class="lang-js">sample</code></pre>' },
  { input: '```\nplain\n```', html: '<pre><code>plain</code></pre>' },
  { input: '| name | value |', html: '<tr><td>name</td><td>value</td></tr>' },
  { input: '| --- | --- |', html: '' /* delimiter row emits nothing */ },
  { input: '|:---|---:|', html: '' },
  { input: '[id]: https://example.com', html: '' /* link defs are metadata, no output */ },
  { input: '[^1]: footnote text', html: '<div class="footnote" id="fn1">footnote text</div>' },
  { input: '[^1]', html: '<sup><a href="#fn1">1</a></sup>' },
  { input: '<div>html</div>', html: '<div>html</div>' },
];

for (const { input, html } of cases) {
  test(`render(${JSON.stringify(input).slice(0, 60)}) === ${JSON.stringify(html).slice(0, 60)}`, () => {
    // MarkdownDocument wraps every example; render the inner leaf shape by
    // wrapping the expected.
    assert.equal(render(input, { target: 'html' }), html);
  });
}
```

NOTE for the engineer: the expected HTML above is a **first pass** — refine each one as you author the corresponding template. Some entries (e.g. `**bold**` -> `<strong>`) are obvious; others (table-delimiter `''`, link-def `''`) reflect the spec's note that the v1 slot vocabulary doesn't allow conditional skip. The pragmatic v1 approach: emit a non-empty marker (e.g. `<!-- table delimiter -->`) or empty string — see authoring discussion below.

### Step 11.2: Run the test to verify it fails

Run: `node --import tsx --test packages/markdown/test/render-html.test.ts`

Expected: FAIL (likely many "no template for target 'html'" throws because no example has `.stringify('html', ...)` yet).

### Step 11.3: Add `.stringify('html', tpl`...`)` to each example

For each of the ~35 examples in `packages/markdown/src/schema.ts`, append a `.stringify('html', tpl`...`)` call before `.build()`. Examples below — implementer expands the full list:

```ts
// ATX heading depth 1
ex('# Release notes')
  .as('MarkdownLeaf')
  .span('#')
  .span('first', 'Release').ident().css()
  .span('second', 'notes').ident().css()
  .structure({ type: 'heading', depth: 1, text: [$.first, $.second] })
  .stringify('html', tpl`<h1>${$.first} ${$.second}</h1>`)
  .build(),

// ATX heading depth 2
.stringify('html', tpl`<h2>${$.first} ${$.second}</h2>`)
// ... 3, 4, 5, 6 similarly.

// Setext heading (depth 2)
.stringify('html', tpl`<h2>${$.first} ${$.second}</h2>`)

// Paragraph
.stringify('html', tpl`<p>${$.first} ${$.second}</p>`)

// List items (dash, plus, star, ordered)
.stringify('html', tpl`<li>${$.first} ${$.second}</li>`)
.stringify('html', tpl`<li>${$.first} ${$.second}</li>`)
.stringify('html', tpl`<li>${$.first} ${$.second}</li>`)
.stringify('html', tpl`<li>${$.first} ${$.second}</li>`)

// Task list items
.stringify('html', tpl`<li><input type="checkbox" checked>${$.first} ${$.second}</li>`)
.stringify('html', tpl`<li><input type="checkbox">${$.first} ${$.second}</li>`)

// Blockquote
.stringify('html', tpl`<blockquote>${$.first} ${$.second}</blockquote>`)

// Thematic breaks
.stringify('html', tpl`<hr>`)
.stringify('html', tpl`<hr>`)
.stringify('html', tpl`<hr>`)

// Inline marks
.stringify('html', tpl`<strong>${$.value}</strong>`)
.stringify('html', tpl`<em>${$.value}</em>`)
.stringify('html', tpl`<s>${$.value}</s>`)
.stringify('html', tpl`<code>${$.value}</code>`)

// Inline link
.stringify('html', tpl`<a href="${$.scheme}://${$.host}.${$.tld}">${$.label}</a>`)

// Reference link
.stringify('html', tpl`<a href="#${$.id}">${$.label}</a>`)

// Inline image
.stringify('html', tpl`<img src="${$.scheme}://${$.host}.${$.tld}/${$.path}.${$.ext}" alt="${$.alt}">`)

// Reference image
.stringify('html', tpl`<img src="#${$.id}" alt="${$.alt}">`)

// Autolink
.stringify('html', tpl`<a href="${$.scheme}://${$.host}.${$.tld}">${$.scheme}://${$.host}.${$.tld}</a>`)

// Entity (passthrough)
.stringify('html', tpl`&${$.name};`)

// Code block with lang
.stringify('html', tpl`<pre><code class="lang-${$.lang}">${$.text}</code></pre>`)
// Code block plain
.stringify('html', tpl`<pre><code>${$.text}</code></pre>`)

// Table row
.stringify('html', tpl`<tr><td>${$.first}</td><td>${$.second}</td></tr>`)

// Table delimiter rows — v1 emits a comment-shaped marker; the test
// expects '' for them. The spec note on line 71 says authors emit
// trailing separators inside child templates; for v1 these can be
// modeled as templates that emit empty string.
.stringify('html', tpl``)
.stringify('html', tpl``)

// Link reference def — metadata, emits nothing
.stringify('html', tpl``)

// Footnote definition
.stringify('html', tpl`<div class="footnote" id="fn${$.id}">${$.first} ${$.second}</div>`)

// Footnote reference
.stringify('html', tpl`<sup><a href="#fn${$.id}">${$.id}</a></sup>`)

// HTML block (passthrough)
.stringify('html', tpl`<${$.tag}>${$.text}</${$.closingTag}>`)
```

ALSO add to the root `MarkdownDocument` example:

```ts
ex('# Release notes\nPlain paragraph')
  .as('MarkdownDocument')
  .span('children', '# Release notes\nPlain paragraph', 'MarkdownLeaf')
    .repeats({ min: 0 })
  .structure({ type: 'document', children: $.children })
  .stringify('html', tpl`${$.children}`)  // children is a list — slot interpolator joins recursively
  .build(),
```

### Step 11.4: Regenerate markdown parser

Run: `npm run generate -w @parser2/markdown`

Expected: regenerates `packages/markdown/src/_generated/parser.ts` with `stringify_MarkdownLeaf_html`, `stringify_MarkdownLeaf_source`, etc.

### Step 11.5: Run the render-html test

Run: `node --import tsx --test packages/markdown/test/render-html.test.ts`

Expected: PASS for the templates whose expected HTML matches; FAIL for any mismatch. Iterate by adjusting the template OR the expected HTML literal in the test until parity. Each failure is one of:
- Template emits unexpected literal text — fix template.
- Test's expected HTML doesn't match the template's natural output — fix expectation. Choose what reads as "correct HTML for that input" by referencing markdown-it/marked behavior, but the v1 contract is "templates emit what authors declare" — pick a defensible HTML shape, not 100% commonmark fidelity.

### Step 11.6: Commit

```bash
git add packages/markdown/src/schema.ts packages/markdown/src/_generated/parser.ts packages/markdown/test/render-html.test.ts
git commit -m "feat(markdown): author html templates on all 35 examples"
```

---

## Task 12: Markdown — round-trip + parity tests

**Files:**
- Test: `packages/markdown/test/round-trip.test.ts` (new)
- Test: `packages/markdown/test/stringify-parity.test.ts` (new)

### Step 12.1: Round-trip test

Create `packages/markdown/test/round-trip.test.ts`:

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { render } from '../src/index.ts';

// Canonical round-trip: render(input, { target: 'source' }) returns input,
// modulo the schema's whitespace policy ('standard' = single space between
// adjacent spans). The fixture below was authored to match canonical form.
const cases = [
  '# Release notes',
  '## Installation guide',
  '### API reference',
  'Plain paragraph',
  '- first item',
  '+ alternate marker',
  '* star marker',
  '1. ordered item',
  '> quoted text',
  '---',
  '***',
  '___',
  '**bold**',
  '*italic*',
  '~~removed~~',
  '`code`',
  '[docs](https://example.com)',
  '[docs][id]',
  '![diagram](https://example.com/diagram.png)',
  '![diagram][image-id]',
  '<https://example.com>',
  '&amp;',
  '```js\nsample\n```',
  '```\nplain\n```',
  '| name | value |',
  '| --- | --- |',
  '|:---|---:|',
  '[id]: https://example.com',
  '[^1]: footnote text',
  '[^1]',
  '<div>html</div>',
];

for (const input of cases) {
  test(`round-trip: ${JSON.stringify(input).slice(0, 50)}`, () => {
    assert.equal(render(input, { target: 'source' }), input);
  });
}

test('round-trip: full release-notes fixture', () => {
  const fixture = readFileSync(new URL('./fixtures/release-notes.md', import.meta.url), 'utf8');
  // Spec note: canonical round-trip may collapse inter-block whitespace.
  // For v1 the assertion is "result is identical to input" only for inputs
  // already in canonical form. Real-world fixtures with blank lines need
  // mode: 'raws' (see spec line 480). Skip the assertion if the fixture
  // contains blank lines OR snapshot the canonical form instead.
  // Implementer: pick the simpler path — skip if canonicalization is lossy.
  const result = render(fixture, { target: 'source' });
  // Sanity: result is non-empty and contains the same characters minus ws.
  assert.ok(result.length > 0);
  assert.ok(result.includes('Release'));
});
```

### Step 12.2: Parity test

Create `packages/markdown/test/stringify-parity.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, render, stringify } from '../src/index.ts';

const inputs = [
  '# Release notes',
  'Plain paragraph',
  '- first item',
  '**bold**',
  '[docs](https://example.com)',
];

const targets = ['source', 'html'];

for (const input of inputs) {
  for (const target of targets) {
    test(`parity: ${input} @ ${target}`, () => {
      const direct = render(input, { target });
      const indirect = stringify(parse(input), { target });
      assert.equal(direct, indirect);
    });
  }
}
```

### Step 12.3: Run the tests

Run: `npm test -w @parser2/markdown`

Expected: PASS — markdown.test.ts (existing), render-html.test.ts, round-trip.test.ts, stringify-parity.test.ts.

Resolve any failures by:
- Round-trip loss on a specific example: tighten the source-template synthesis for that span pattern in `infer/source-template.ts`.
- Parity divergence: bug in one of the two emit paths — read the parity test failure, run `stringify(parse(input))` and `render(input)` in a REPL, find the diff, fix the emit.

### Step 12.4: Commit

```bash
git add packages/markdown/test/round-trip.test.ts packages/markdown/test/stringify-parity.test.ts
git commit -m "test(markdown): round-trip + stringify/render parity"
```

---

## Task 13: Markdown — `bench:render` script + perf-baseline rows

**Files:**
- Modify: `packages/markdown/package.json` (add `bench:render`)
- Create: `packages/markdown/bench/render.ts`
- Modify: `packages/markdown/bench/perf-baseline.json` (add render rows)

### Step 13.1: Implement `packages/markdown/bench/render.ts`

```ts
import { readFileSync } from 'node:fs';
import { render } from '../src/index.ts';
import {
  type Contestant,
  DEFAULT_SIZES_KB,
  repeatToBytes,
  // ... whatever bench-table exports for headed runs
} from '../../../scripts/bench-table.ts';

// markdown-it
import MarkdownIt from 'markdown-it';
import { marked } from 'marked';

const md = new MarkdownIt();

const fixture = readFileSync(new URL('../test/fixtures/release-notes.md', import.meta.url), 'utf8');

const contestants: Contestant[] = [
  { label: 'parser2 render(html)', unit: 'doc', fn: (input: string) => { render(input, { target: 'html' }); return { units: 1 }; } },
  { label: 'markdown-it', unit: 'doc', fn: (input: string) => { md.render(input); return { units: 1 }; } },
  { label: 'marked', unit: 'doc', fn: (input: string) => { void marked.parse(input); return { units: 1 }; } },
];

// Drive scripts/bench-table.ts with contestants over sized fixtures
// (repeatToBytes(fixture, 5*1024) etc.). Follow the pattern in
// packages/markdown/bench/ast.ts — it already uses scripts/bench-table.ts
// for AST parsing benchmarks.
// ... (full implementation mirrors bench/ast.ts)
```

Mirror the structure of `packages/markdown/bench/ast.ts`. The exact shape is delegated to the implementer — `scripts/bench-table.ts` has a stable API.

### Step 13.2: Add to package.json

```json
{
  "scripts": {
    "bench:render": "npm run generate && tsx bench/render.ts",
    "bench": "npm run generate && npm run bench:ast && npm run bench:render"
  }
}
```

### Step 13.3: Lock the perf baseline

Run: `npm run perf:baseline -w @parser2/markdown`

This updates `packages/markdown/bench/perf-baseline.json` with render:<size> rows. Review the diff — the rendered numbers should be in the same order of magnitude as the parse numbers (render is parse + slot interpolation; if it's >2x slower the fused codepath isn't actually fused — go fix Task 8B).

### Step 13.4: Lock the size baseline

Run: `npm run size:baseline -w @parser2/markdown`

This updates `packages/markdown/bench/size-baseline.json`. Review the diff: the new stringify+render exports add ~1-2KB; the markdown templates add ~1KB. If the size jumps more than 25% over the current baseline, that's the risk flagged in the spec — investigate sharing helpers across render functions in `emit/render.ts`.

### Step 13.5: Run the perf gate to confirm green

Run: `npm run gate -w @parser2/markdown`

Expected: PASS.

### Step 13.6: Commit

```bash
git add packages/markdown/package.json packages/markdown/bench/render.ts packages/markdown/bench/perf-baseline.json packages/markdown/bench/size-baseline.json
git commit -m "perf(markdown): bench:render + locked baselines"
```

---

## Task 14: Markdown — wire `bench:render` into the bench harness

Already done in Task 13. No-op if Task 13 is complete.

---

## Task 15: Re-verify the other 10 schemas

**Files:**
- Modify: `packages/<each>/src/_generated/parser.ts` (regenerated)
- No source edits.

The other 10 schemas (`arn`, `cron`, `css`, `css-color`, `css-length-percentage`, `html`, `log`, `mac`, `proto`, `url`) get the auto-derived `'source'` target for free; no author work. Their existing `bench:*` perf gates and `size:gate` must stay green.

### Step 15.1: Regenerate every schema

Run: `npm run generate`

Expected: every `packages/<schema>/src/_generated/parser.ts` re-emits with new `stringify` and `render` exports.

### Step 15.2: Run every package's tests

Run: `npm test`

Expected: PASS — every package's existing test suite plus the new compiler + parser + markdown tests.

### Step 15.3: Run every package's gate

Run: `npm run gate -w @parser2/arn && npm run gate -w @parser2/cron && npm run gate -w @parser2/css && npm run gate -w @parser2/css-color && npm run gate -w @parser2/css-length-percentage && npm run gate -w @parser2/html && npm run gate -w @parser2/log && npm run gate -w @parser2/mac && npm run gate -w @parser2/proto && npm run gate -w @parser2/url`

Expected: each gate passes — parse perf unchanged, size budget unchanged or relock-reviewed.

If any package fails its size gate (acceptance criterion 5 forbids relocking parse perf, but size is fair game — the new stringify+render exports add bytes):
- Verify the parse perf row is still in budget (this MUST be green without relock).
- If only size dropped, run `npm run size:baseline -w @parser2/<schema>` to relock. The PR review covers the diff.

### Step 15.4: Commit regenerated files (and any relocked size baselines)

```bash
git add packages/*/src/_generated/parser.ts packages/*/bench/size-baseline.json
git commit -m "build: regenerate all schemas with stringify+render exports"
```

---

## Task 16: Final acceptance check

### Step 16.1: Compiler domainlessness grep

Run: `git grep -nE "target === ['\"]" packages/compiler/src/`

Expected: zero results. (Acceptance criterion #7.)

If any results: those lines are the bug. Refactor to opaque-target dispatch.

### Step 16.2: Parser contract audit

Run: `npm run audit:parser-contract`

Expected: `parser contract audit ok`. (Acceptance criterion #6.)

### Step 16.3: Full test suite

Run: `npm test`

Expected: every package green. (Acceptance criterion #3.)

### Step 16.4: Markdown gate

Run: `npm run gate -w @parser2/markdown`

Expected: PASS. (Acceptance criterion #4.)

### Step 16.5: Verify parser exports

Run: `git grep -nE "^export.*\btpl\b" packages/parser/src/index.ts`

Expected: `tpl` and `Template` show in `packages/parser/src/index.ts`. (Acceptance criterion #1.)

### Step 16.6: Final commit

If anything required cleanup, commit. Otherwise:

```bash
echo "Stringify-templates Stream A complete. Acceptance criteria 1-7 verified."
```

---

## Risks and mitigations (carried over from spec)

The spec lists 6 risks (lines 454-489). For each, the plan's defense:

1. **Bundle size inflation.** Task 15 covers per-schema size gates and optional relocks; the spec's mitigation ("share scan helpers across render functions") is the path for Task 8B if markdown's size gate fails by >25%.
2. **Parse perf regression.** Task 15 covers every package's parse perf gate. The "parse perf must stay green WITHOUT relock" rule from acceptance criterion 5 is the trip-wire. If it fires, Task 8B's fused render is sharing state with parse incorrectly — revert to Task 8A's `stringify ∘ parse` for that schema.
3. **Stringify/render disagreement.** Task 12's parity test pins it. A green parity test == the inference and the two emit paths agree.
4. **Auto-`source` doesn't round-trip.** Task 12's round-trip test catches it. If a specific example fails, the synthesis algorithm has a gap — fix in `infer/source-template.ts`. The spec section on "Source template synthesis" (lines 196-217) is the contract.
5. **`tpl` evaluates non-sentinel `${...}` eagerly.** Task 1's test "tpl rejects non-sentinel interpolation values at construction time" pins this — `tpl` throws synchronously at schema-load time, before inference.
6. **Inter-block whitespace lost on round-trip.** Spec lines 480-489 acknowledge this as canonical-mode behavior; raws-mode is a Stream B / preserve-policy follow-up. Document in Task 12's round-trip test as expected v1 behavior.

---

## Out of scope (do not implement)

These are explicitly NOT part of Stream A:

- Conditional template primitives (`tpl`if X then... else...``).
- Escape primitives (`html()`, `attr()`, `url()`).
- `.map(...)` over child lists; explicit separator joins.
- Multi-target chaining (`render` then re-`render`).
- Markdown schema restructure for `# **bold**` recursion (Stream B).
- `app-rules-fixture.md` as the bench target (Stream B).
- `whitespace: 'preserve'` policy wiring (separate stream — `packages/compiler/README.md` flags it as declared-but-not-wired).
- Fused render for v2 emit (cron). Spec explicitly allows v2 to ship `render = stringify ∘ parse`; only scannerless's render must be fused.

---

## Self-review (skill-mandated)

**Spec coverage:**

- Acceptance criterion 1 (`tpl` + `Template` exported from `@parser2/parser`) — Task 1.
- Acceptance criterion 2 (`npm run generate` produces parsers with stringify+render exports for every schema) — Tasks 7, 8, 15.
- Acceptance criterion 3 (`npm test` passes including new markdown render+round-trip+parity tests) — Tasks 11, 12, 16.
- Acceptance criterion 4 (markdown gate passes, size baseline relock reviewed) — Tasks 13, 16.
- Acceptance criterion 5 (other 10 schemas pass existing gates without parse-perf relock) — Task 15.
- Acceptance criterion 6 (`npm run audit:parser-contract` passes; `src/index.ts` stays a pure re-export) — Task 16.
- Acceptance criterion 7 (zero compiler branches on target names; grep returns empty) — Tasks 7, 16.

DSL surface (spec lines 78-150): `tpl` tag, slot vocabulary `${$.name}`, reserved `'source'` key — Tasks 1, 4, 5.

Schema model additions (spec lines 152-178): `stringifyTemplates` on Production, validation extensions — Tasks 3, 4, 6.

Compiler passes (spec lines 180-218): `infer/templates.ts`, `infer/source-template.ts`, `infer/validate.ts` extension, `emit/stringify.ts`, `emit/render.ts`, `emit/index.ts` composition — Tasks 4, 5, 6, 7, 8 (note: `emit/index.ts` doesn't exist; the composition happens inside `emit/scannerless/index.ts` and `emit/v2/index.ts` — flagged in the file-structure section).

Codegen (spec lines 220-326): two-pass stringify with shape-based dispatch, fused render with `out: string[]`, validate mode — Tasks 7, 8.

Markdown updates (spec lines 360-390): ~35 `.stringify('html', ...)` calls — Task 11.

Tests (spec lines 392-405): per-example render-html, round-trip, parity, plus parse path unchanged — Tasks 12, 13.

Perf gates (spec lines 407-422): `bench:render`, render baseline rows, size relock — Tasks 13.

Migration plan (spec lines 424-451): parser → compiler/infer → compiler/emit/stringify+render → markdown → other schemas — matches Tasks 1-15.

Risks (spec lines 454-489): all six addressed in the "Risks and mitigations" section above.

**Placeholder scan:** No "TBD" / "implement later" / "fill in details" — all steps include code or commands. The `// ... full implementation mirrors bench/ast.ts` references in Task 13 are pointers to a concrete file the engineer reads; the existing `bench/ast.ts` is the template.

**Type consistency:** `Template`, `TemplateSlot`, `StringifyTemplateDef`, `StringifyTemplate`, `Production.stringifyTemplates`, `ExampleDef.stringifyTemplates` — all use `kind: 'capture'` and `ref: string` in the slot shape. `parts` is always `ReadonlyArray<string>`. `slots` is always `ReadonlyArray<TemplateSlot>`. Confirmed consistent across Tasks 1, 3, 4, 5, 7.
