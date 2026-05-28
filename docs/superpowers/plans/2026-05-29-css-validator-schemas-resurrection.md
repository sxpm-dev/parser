# CSS Validator Schemas Resurrection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unlock CSS regen by realizing the "compose schemas" idea: resurrect css-color and css-length-percentage as relation()-DSL sub-schemas inside the css package, and extend the codegen so a schema's validation rules can reference another SchemaDef as a validator (codegen compiles and inlines it with prefix isolation).

**Architecture:** Sub-schemas live as `packages/css/src/validators/{color,length-percentage}.ts` (regular `SchemaDef` modules). The css schema's `defineValidation` chain references these `SchemaDef` objects directly (new API surface: `.validate(SchemaDef)`). At codegen time, the compiler emits each referenced sub-schema's parser source with a unique symbol prefix into the parent's generated parser, then aliases each inlined `validate` function as `__validator_N`. Symbol collisions are prevented via a new `symbolPrefix` option on `GenerateOptions` that prefixes every emitted top-level function in the v2 backend.

**Tech Stack:** TypeScript, node:test, the existing parser3_codex relation() DSL, the v2 emit backend (`packages/compiler/src/emit/v2/`).

---

## File Structure

**Create:**
- `packages/css/src/validators/color.ts` — css-color SchemaDef on relation() DSL (≈220 lines, ported from `git show b65ebcf~1:packages/css-color/src/schema.ts`)
- `packages/css/src/validators/length-percentage.ts` — css-length-percentage SchemaDef on relation() DSL (≈220 lines, ported from `git show b65ebcf~1:packages/css-length-percentage/src/schema.ts`)
- `packages/css/test/validators-color.test.ts` — unit tests for color sub-schema (positive + negative cases)
- `packages/css/test/validators-length-percentage.test.ts` — unit tests for length-percentage sub-schema
- `packages/compiler/test/inline-validator-composition.test.ts` — integration test that a parent schema with `SchemaDef`-as-validator compiles and runs
- `packages/compiler/src/emit/v2/symbol-prefix.ts` — helper that wraps function-declaration emission with a configurable symbol prefix

**Modify:**
- `packages/parser/src/types.ts` — broaden `ValidationRuleDef.validator` to allow a SchemaDef in addition to ValidatorImport
- `packages/parser/src/validation.ts` — broaden `defineValidation.validate(...)` to accept `SchemaDef` directly
- `packages/compiler/src/index.ts` — add `symbolPrefix?: string` to `GenerateOptions`
- `packages/compiler/src/model.ts` — add `symbolPrefix?: string` to `InferredSchema`
- `packages/compiler/src/emit/v2/index.ts` — thread `symbolPrefix` through emit + inline sub-schema validators
- `packages/compiler/src/emit/v2/validate-emit.ts` — when a validator rule references an embedded SchemaDef, recursively compile it with a unique prefix and inline (instead of emitting an import)
- `packages/css/src/schema.ts` — restore validation chain (line 385) to reference the local sub-schemas
- `packages/css/src/_generated/parser.ts` — regenerated from scratch (no longer hand-edited)
- `packages/parser/test/generated-parser-ir.golden.json` — bump css golden hash after regen
- `docs/v2-migration-status.md` — mark Phase 9 follow-up #1 as Resolved with commit SHA

**Reference (read-only):**
- `packages/cron/src/schema.ts` — canonical relation() DSL example; use as template style
- `packages/yaml-block/src/schema.ts` — short, focused relation() schema; another style reference
- `packages/compiler/src/emit/v2/validate-emit.ts` (current state) — see the existing import-based emit path you're extending

---

## Phase 0: Probe — port one production, verify approach

The deleted schemas claim "broken on old DSL since Phase 6". Before committing to full resurrection, port one production to relation() and confirm it compiles. This phase is throwaway code — don't commit it.

### Task 0.1: Probe css-color's simplest production

**Files:**
- Temp: `/tmp/probe-color.ts` (do NOT add to repo)

- [ ] **Step 1: Pull deleted css-color schema source from git**

```bash
git show b65ebcf~1:packages/css-color/src/schema.ts > /tmp/deleted-css-color.ts
wc -l /tmp/deleted-css-color.ts   # expect 201
```

- [ ] **Step 2: Read packages/cron/src/schema.ts for relation() DSL patterns**

Read the cron schema in full. Note the relation() call signature: `relation('NodeType', { input, encodings: { parse, ast, source } })`. Each example is a single relation() call, not a chained ex() builder.

- [ ] **Step 3: Port the simplest css-color production (color keyword) to relation()**

Write `/tmp/probe-color.ts`:

```typescript
import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';
import { generateParser } from '../../parser3_codex/packages/compiler/src/index.ts';

const COLOR_KEYWORDS = ['red', 'blue', 'green', 'transparent'] as const;

const schema = defineSchema({
  rootType: 'CssColor',
  punctuators: {},
  tokens: [],
  examples: [
    relation('CssColorValue', {
      input: 'red',
      encodings: {
        parse: parse([
          span('value', 'red').ident().css().oneOf(COLOR_KEYWORDS),
        ]),
        ast: { type: 'color-keyword', value: $.value },
        // No source target — matches the original css-color design
        // (it was AST-only because the v1 source-template inverse cannot
        // disambiguate bare-slot productions).
      },
    }),
    relation('CssColor', {
      input: 'red',
      encodings: {
        parse: parse([
          span('value', 'red').of('CssColorValue'),
        ]),
        ast: { type: 'css-color', value: $.value },
      },
    }),
  ],
});

console.log(generateParser(schema, undefined, { packageName: 'probe' }).slice(0, 400));
```

- [ ] **Step 4: Run the probe**

```bash
cd /Users/valerii/Develop/parser3_codex
tsx /tmp/probe-color.ts 2>&1 | head -40
```

Expected: Either it prints the first 400 chars of a generated parser (probe succeeds), or it prints a compile-time error from the codegen. If success, the relation() port pattern is viable. If failure, capture the error — it informs Phase A's planning.

- [ ] **Step 5: Record findings in commit log of next phase**

Do NOT commit the probe. The findings inform Phase A. If the probe fails for a non-obvious reason, escalate to the user before proceeding.

- [ ] **Step 6: Cleanup**

```bash
rm /tmp/probe-color.ts /tmp/deleted-css-color.ts
```

---

## Phase A: Resurrect css-color sub-schema

Port the full deleted css-color schema to relation() DSL, place it in `packages/css/src/validators/color.ts`, give it unit tests that exercise parser correctness, and verify codegen produces a working parser.

### Task A.1: Create directory and add color.ts schema (ported from ex() to relation())

**Files:**
- Create: `packages/css/src/validators/color.ts`
- Reference: `git show b65ebcf~1:packages/css-color/src/schema.ts` (source-of-truth for examples)
- Reference: `packages/cron/src/schema.ts` (DSL pattern)

- [ ] **Step 1: Pull the deleted schema as a starting reference**

```bash
git show b65ebcf~1:packages/css-color/src/schema.ts > /tmp/css-color-original.ts
```

Open `/tmp/css-color-original.ts`. Note these examples (16 total):
- 5 `CssColorValue` productions: color-keyword, hash-color, rgb-color-function, color-function (oklch), var-function
- 4 `NumericColorFunctionToken` productions: percentage, number, separator (/), separator (,)
- 6 `ColorFunctionToken` productions: percentage, number, ident, string, separator (/), separator (,)
- 1 `CssColor` wrapper production

Constants used: `COLOR_KEYWORDS`, `COLOR_FUNCTIONS`, `RGB_FUNCTIONS`, `NON_RGB_COLOR_FUNCTIONS`.

- [ ] **Step 2: Write `packages/css/src/validators/color.ts` with the relation() port**

The header comment from the original (lines 35-72 in the deleted file) explains design constraints — preserve it. Then write the schema using relation() with this mechanical translation:

For each ex() example:
- `ex('input').as('NodeType').<chain>.render('ast', astExpr).build()`
  →
- `relation('NodeType', { input: 'input', encodings: { parse: parse([<spans from chain>]), ast: astExpr } })`

Use the cron schema's style as a template. Order productions exactly as in the original.

Specific span translations:
- `.span('value', 'red').ident().css().oneOf(COLOR_KEYWORDS)` → `span('value', 'red').ident().css().oneOf(COLOR_KEYWORDS)` (unchanged in the parse() array)
- `.span('#').noWhitespaceAfter()` → `literal('#').noWhitespaceAfter()` if `literal()` supports it, otherwise `span('#').noWhitespaceAfter()`. Check the parser export from `@parser2/parser`.
- `.span('args', '255', 'NumericColorFunctionToken').repeats({ min: 1 })` → `span('args', '255').of('NumericColorFunctionToken').repeats({ min: 1 })` (the role-name moves to `.of()` per cron's pattern; verify against cron's `span('words', 'npm').of('CommandWord').repeats({ min: 1 })`)
- `.span('args', '--brand-color, red').until(')', { rejectSuffix: ',' })` → `span('args', '--brand-color, red').until(')', { rejectSuffix: ',' })` (unchanged)
- `.span('value', '00ff99').hex()` → `span('value', '00ff99').hex()` (unchanged)

Set `rootType: 'CssColor'`. The original used these top-level fields:
```typescript
punctuators: { hash: '#', lparen: '(', rparen: ')', delim: ['%', ',', '/'] },
tokens: ['number', 'string'],
```

Keep them. Do NOT add a `source` target (matches the original constraint — see header comment).

Use `export default` for the schema.

- [ ] **Step 3: Build the css package to typecheck the new file**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run build -w "@parser2/css" 2>&1 | tail -20
```

Expected: clean build OR specific TypeScript errors. Fix any type errors before proceeding.

- [ ] **Step 4: Verify codegen accepts the schema standalone**

```bash
cd /Users/valerii/Develop/parser3_codex
tsx -e "
import schema from './packages/css/src/validators/color.ts';
import { generateParser } from './packages/compiler/src/index.ts';
const code = generateParser(schema, undefined, { packageName: 'css-color' });
console.log('OK,', code.length, 'chars');
" 2>&1 | tail -10
```

Expected: `OK, NNNN chars`. If a `checkRoundTrip` or `checkDispatch` error fires, fix the schema or escalate.

- [ ] **Step 5: Commit the schema (before tests, so the diff is reviewable in isolation)**

```bash
git add packages/css/src/validators/color.ts
git commit -m "feat(css): resurrect css-color as sub-schema on relation() DSL

Ports the deleted packages/css-color schema (commit b65ebcf~1) to the new
relation() DSL. Placed as a sub-module of css since it serves only as a
property-value validator for the css schema. Sixteen productions covering
keyword / hash / rgb-function / oklch-function / var-function / numeric and
non-numeric tokens / root wrapper. No source target — preserves the
original's AST-only design constraint."
```

### Task A.2: Add unit tests for color sub-schema

**Files:**
- Create: `packages/css/test/validators-color.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateParser } from '../../compiler/src/index.ts';
import colorSchema from '../src/validators/color.ts';

const source = generateParser(colorSchema, undefined, { packageName: 'css-color' });

// Build an importable module from the generated source
const blob = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const mod = await import(blob) as { parse: (s: string) => unknown; validate: (s: string) => void };

test('parses color keyword', () => {
  const ast = mod.parse('red');
  assert.deepEqual(ast, { type: 'css-color', value: { type: 'color-keyword', value: 'red' } });
});

test('parses hash color', () => {
  const ast = mod.parse('#00ff99');
  assert.deepEqual(ast, { type: 'css-color', value: { type: 'hash-color', value: '00ff99' } });
});

test('parses rgb function', () => {
  const ast = mod.parse('rgb(255 0 0 / 1)');
  assert.equal((ast as any).value.type, 'rgb-color-function');
  assert.equal((ast as any).value.name, 'rgb');
});

test('parses oklch function', () => {
  const ast = mod.parse('oklch(60% 0.2 30)');
  assert.equal((ast as any).value.type, 'color-function');
  assert.equal((ast as any).value.name, 'oklch');
});

test('parses var function', () => {
  const ast = mod.parse('var(--brand-color, red)');
  assert.equal((ast as any).value.type, 'var-function');
});

test('validate accepts valid colors', () => {
  assert.doesNotThrow(() => mod.validate('red'));
  assert.doesNotThrow(() => mod.validate('#abc123'));
  assert.doesNotThrow(() => mod.validate('rgb(255 0 0)'));
});

test('validate rejects non-color strings', () => {
  assert.throws(() => mod.validate('not-a-color-keyword'));
  assert.throws(() => mod.validate('123px'));
  assert.throws(() => mod.validate(''));
});
```

- [ ] **Step 2: Run tests to verify they fail or pass**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run test -w "@parser2/css" 2>&1 | tail -20
```

Expected: New tests run as part of the css suite. If failures point to schema bugs, fix the schema; if to test wrongness, fix the tests. Do NOT change parser/compiler internals here — those changes belong in their own phase.

- [ ] **Step 3: When all tests green, commit**

```bash
git add packages/css/test/validators-color.test.ts
git commit -m "test(css): unit tests for css-color sub-schema

Eight test cases covering the five CssColorValue productions plus the
validate() fn's positive and negative behavior. Parser is materialized
from a data: URL import so the test exercises generateParser end-to-end."
```

---

## Phase B: Resurrect css-length-percentage sub-schema

Same pattern as Phase A. The original is 204 lines, 14 examples across LengthPercentageItem (calc, var, keyword, percentage with sign, zero) and LengthFunctionToken (dimension, percentage, zero, operators, separator). Plus a CssLengthPercentage root wrapper accepting 1-4 items.

### Task B.1: Create length-percentage.ts schema

**Files:**
- Create: `packages/css/src/validators/length-percentage.ts`
- Reference: `git show b65ebcf~1:packages/css-length-percentage/src/schema.ts`

- [ ] **Step 1: Pull the deleted schema source**

```bash
git show b65ebcf~1:packages/css-length-percentage/src/schema.ts > /tmp/css-length-original.ts
```

- [ ] **Step 2: Read the original top-of-file**

```bash
head -50 /tmp/css-length-original.ts
```

Note: it has its own list of constants (`LENGTH_UNITS`, `LENGTH_KEYWORDS`, `LENGTH_FUNCTIONS`) and a header comment block. Preserve both.

- [ ] **Step 3: Port to relation() following the same mechanical translation as Task A.1 Step 2**

Special cases:
- The `-50%` production has a leading literal `-` span before the value span — translate `span('-')` → `literal('-')` in the parse() array.
- The `0` production uses `.oneOf(['0'])` after `.number()` — keep this in the span chain.
- The root `CssLengthPercentage` production uses `repeats({ min: 1, max: 4 })` — translate as `span('items', '10px').of('LengthPercentageItem').repeats({ min: 1, max: 4 })`.
- No source target.

Set `rootType: 'CssLengthPercentage'`. Use `export default`.

- [ ] **Step 4: Build the css package to typecheck**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run build -w "@parser2/css" 2>&1 | tail -20
```

Expected: clean.

- [ ] **Step 5: Verify codegen accepts standalone**

```bash
cd /Users/valerii/Develop/parser3_codex
tsx -e "
import schema from './packages/css/src/validators/length-percentage.ts';
import { generateParser } from './packages/compiler/src/index.ts';
console.log('OK,', generateParser(schema, undefined, { packageName: 'css-length-percentage' }).length, 'chars');
" 2>&1 | tail -5
```

Expected: `OK, NNNN chars`.

- [ ] **Step 6: Commit**

```bash
git add packages/css/src/validators/length-percentage.ts
git commit -m "feat(css): resurrect css-length-percentage as sub-schema on relation() DSL

Ports the deleted packages/css-length-percentage schema (commit b65ebcf~1)
to the new relation() DSL. Placed as a sub-module of css. Fourteen
productions covering LengthPercentageItem (signed percentage, zero, calc,
var, keyword) and LengthFunctionToken (dimension, percentage, zero,
arithmetic operators, separator) plus the CssLengthPercentage 1-4-items
root wrapper. AST-only, matching the original's design constraint."
```

### Task B.2: Add unit tests for length-percentage sub-schema

**Files:**
- Create: `packages/css/test/validators-length-percentage.test.ts`

- [ ] **Step 1: Write tests**

```typescript
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateParser } from '../../compiler/src/index.ts';
import lengthSchema from '../src/validators/length-percentage.ts';

const source = generateParser(lengthSchema, undefined, { packageName: 'css-length-percentage' });
const blob = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const mod = await import(blob) as { parse: (s: string) => unknown; validate: (s: string) => void };

test('parses dimension', () => {
  const ast = mod.parse('10px');
  assert.equal((ast as any).type, 'css-length-percentage');
  assert.equal((ast as any).items[0].type, 'dimension');
});

test('parses percentage', () => {
  const ast = mod.parse('50%');
  assert.equal((ast as any).items[0].type, 'percentage');
});

test('parses negative percentage', () => {
  const ast = mod.parse('-50%');
  assert.equal((ast as any).items[0].type, 'percentage');
});

test('parses zero', () => {
  const ast = mod.parse('0');
  assert.equal((ast as any).items[0].type, 'zero');
});

test('parses calc expression', () => {
  const ast = mod.parse('calc(100% - 1rem)');
  assert.equal((ast as any).items[0].type, 'length-function');
  assert.equal((ast as any).items[0].name, 'calc');
});

test('parses multi-item shorthand', () => {
  const ast = mod.parse('10px 20px 5px 0');
  assert.equal((ast as any).items.length, 4);
});

test('validate accepts valid lengths', () => {
  assert.doesNotThrow(() => mod.validate('10px'));
  assert.doesNotThrow(() => mod.validate('1.5rem'));
  assert.doesNotThrow(() => mod.validate('100%'));
  assert.doesNotThrow(() => mod.validate('auto'));
});

test('validate rejects non-lengths', () => {
  assert.throws(() => mod.validate('red'));
  assert.throws(() => mod.validate('123notaunit'));
  assert.throws(() => mod.validate(''));
});
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run test -w "@parser2/css" 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add packages/css/test/validators-length-percentage.test.ts
git commit -m "test(css): unit tests for css-length-percentage sub-schema

Eight test cases covering the dimension/percentage/zero/calc/var/keyword
productions, multi-item shorthand parsing, and validate() positive +
negative behavior."
```

---

## Phase C: Codegen — SchemaDef-as-validator composition

Extend `defineValidation.validate()` to accept a SchemaDef directly. Extend the codegen to detect this case, compile the sub-schema recursively with a unique symbol prefix, and inline its source into the parent's generated parser.

### Task C.1: Add `symbolPrefix` plumbing through compiler

**Files:**
- Modify: `packages/compiler/src/index.ts` (GenerateOptions)
- Modify: `packages/compiler/src/model.ts` (InferredSchema)
- Modify: `packages/compiler/src/emit/v2/index.ts` (thread prefix into emit)

- [ ] **Step 1: Read current shape**

```bash
cd /Users/valerii/Develop/parser3_codex
sed -n '19,82p' packages/compiler/src/index.ts
grep -n "packageName" packages/compiler/src/model.ts | head -5
```

- [ ] **Step 2: Add symbolPrefix field to GenerateOptions**

In `packages/compiler/src/index.ts`, add to `GenerateOptions`:

```typescript
export type GenerateOptions = {
  readonly packageName?: string;
  readonly backend?: Backend;
  // Symbol prefix prepended to every emitted top-level function name in the
  // v2 backend. Used by the inline-validator pass when composing a
  // sub-schema's parser into a parent's generated source — each sub-schema
  // gets a unique prefix to avoid collisions. Default '' (no prefix).
  readonly symbolPrefix?: string;
};
```

In `inferSchema()`, plumb it through:

```typescript
const inferred: InferredSchema = {
  // ... existing fields ...
  symbolPrefix: options.symbolPrefix ?? '',
};
```

- [ ] **Step 3: Add symbolPrefix to InferredSchema**

In `packages/compiler/src/model.ts`, add `readonly symbolPrefix: string;` to the `InferredSchema` type.

- [ ] **Step 4: Make v2 backend honor symbolPrefix**

In `packages/compiler/src/emit/v2/index.ts`, find every place that emits a function declaration name. Each should prepend `schema.symbolPrefix`. The exports at the bottom (`export function parse`, `export function validate`) keep their public names — only INTERNAL function names get prefixed.

Read the file to identify call sites:

```bash
cd /Users/valerii/Develop/parser3_codex
grep -n "function \|parseFn\|FnName" packages/compiler/src/emit/v2/index.ts | head -30
```

The minimal change: locate the `parseFnName` helper and similar helpers that derive function names from a node type. Wrap each with `schema.symbolPrefix + ...`.

- [ ] **Step 5: Add a regression test that bare emit is byte-identical to before**

In `packages/compiler/test/v2-regressions.test.ts` (or a new file), assert that calling `generateParser(schema, undefined, { packageName: 'x' })` (no symbolPrefix) produces output identical to the same call with `symbolPrefix: ''`. This catches accidental prefix prepends.

```typescript
test('symbolPrefix defaults are byte-identical to omitted prefix', () => {
  // Use any existing in-tree schema for the comparison; cron is small.
  const cronSchema = (await import('@parser2/cron/src/schema.ts')).default;
  const withoutOpt = generateParser(cronSchema, undefined, { packageName: 'cron' });
  const withEmpty = generateParser(cronSchema, undefined, { packageName: 'cron', symbolPrefix: '' });
  assert.equal(withoutOpt, withEmpty);
});
```

- [ ] **Step 6: Verify all compiler tests still pass**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run test -w "@parser2/compiler" 2>&1 | tail -5
```

Expected: 374 + 1 new = 375 tests, all pass.

- [ ] **Step 7: Verify IR gate still passes**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run test -w "@parser2/parser" 2>&1 | tail -5
```

Expected: 80/80. The gate verifies that NO existing generated parser changed — symbolPrefix plumbing must be inert when default-empty.

- [ ] **Step 8: Commit**

```bash
git add packages/compiler/src/index.ts packages/compiler/src/model.ts packages/compiler/src/emit/v2/index.ts packages/compiler/test/v2-regressions.test.ts
git commit -m "feat(compiler): add symbolPrefix option to v2 emit

Plumbs an optional 'symbolPrefix' through GenerateOptions and InferredSchema
into the v2 backend's function-name emission. Default empty — produces byte-
identical output to the prior code path (verified by IR gate + regression
test). Used by the upcoming inline-validator composition pass."
```

### Task C.2: Broaden ValidationRuleDef and defineValidation to accept SchemaDef

**Files:**
- Modify: `packages/parser/src/types.ts` (lines 388-399)
- Modify: `packages/parser/src/validation.ts` (validate method)
- Add tests: `packages/parser/test/validation-with-schemadef.test.ts`

- [ ] **Step 1: Write the failing test first**

`packages/parser/test/validation-with-schemadef.test.ts`:

```typescript
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { defineSchema, defineValidation, parse, relation, span } from '../src/index.ts';

import { $ } from '../src/index.ts';

const childSchema = defineSchema({
  rootType: 'Word',
  punctuators: {},
  tokens: [],
  examples: [
    relation('Word', {
      input: 'foo',
      encodings: {
        parse: parse([span('value', 'foo').ident().css()]),
        ast: { type: 'word', value: $.value },
      },
    }),
  ],
});

const parentSchema = defineSchema({
  rootType: 'Pair',
  punctuators: {},
  tokens: [],
  examples: [
    relation('Pair', {
      input: 'foo bar',
      encodings: {
        parse: parse([span('a', 'foo'), span('b', 'bar')]),
        ast: { type: 'pair' },
      },
    }),
  ],
});

test('defineValidation.validate accepts a SchemaDef', () => {
  const validation = defineValidation(parentSchema)
    .node('Pair')
    .field('a')
    .match('type', 'pair')
    .validate(childSchema)  // <-- new API surface
    .build();

  assert.equal(validation.rules.length, 1);
  // The internal representation should preserve the SchemaDef reference.
  assert.equal((validation.rules[0]?.validator as any).schema, childSchema);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run test -w "@parser2/parser" 2>&1 | tail -10
```

Expected: TypeError "validator must be a generated parser validate export".

- [ ] **Step 3: Broaden the type definitions**

In `packages/parser/src/types.ts`, update `ValidationRuleDef.validator`:

```typescript
// Either an external module import (legacy) or an inline sub-schema (new in
// the css validator composition work).
export type ValidatorRef =
  | { readonly kind: 'import'; readonly module: string; readonly exportName: string }
  | { readonly kind: 'inline'; readonly schema: SchemaDef };

export type ValidationRuleDef = {
  readonly nodeType: string;
  readonly field: string;
  readonly matchField: string;
  readonly matchValues: ReadonlyArray<string>;
  readonly validator: ValidatorRef;
};
```

Note: existing callers that constructed `{ module, exportName }` literally will break — update `defineValidation.validate()` to wrap them with `{ kind: 'import', ... }`. The exported `ValidatorImport` type remains for backwards compatibility on the `__parser2Validator` metadata.

- [ ] **Step 4: Update `defineValidation.validate()` in `packages/parser/src/validation.ts`**

```typescript
validate(validator: GeneratedValidator | SchemaDef): this {
  const draft = this.requireDraft();
  if (!draft.field) throw new TypeError('defineValidation.validate: missing field(...)');
  if (!draft.matchField || !draft.matchValues) {
    throw new TypeError('defineValidation.validate: missing match(...)');
  }
  let ref: ValidatorRef;
  if (isSchemaDef(validator)) {
    ref = { kind: 'inline', schema: validator };
  } else {
    const importMeta = (validator as GeneratedValidator).__parser2Validator;
    if (!importMeta) {
      throw new TypeError('defineValidation.validate: validator must be a SchemaDef or a generated validate export');
    }
    ref = { kind: 'import', module: importMeta.module, exportName: importMeta.exportName };
  }
  this.rules.push({
    nodeType: draft.nodeType,
    field: draft.field,
    matchField: draft.matchField,
    matchValues: draft.matchValues,
    validator: ref,
  });
  this.draft = null;
  return this;
}
```

Add a local `isSchemaDef` predicate:

```typescript
function isSchemaDef(value: unknown): value is SchemaDef {
  return typeof value === 'object' && value !== null
    && typeof (value as { rootType?: unknown }).rootType === 'string'
    && Array.isArray((value as { examples?: unknown }).examples);
}
```

- [ ] **Step 5: Run the failing test — should now pass**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run test -w "@parser2/parser" 2>&1 | tail -10
```

Expected: 81/81 (80 baseline + 1 new).

- [ ] **Step 6: Run compiler tests — emit must be updated to read the new shape**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run test -w "@parser2/compiler" 2>&1 | tail -10
```

Expected: compiler tests fail because validate-emit.ts reads `validator.module` directly. The fix is Task C.3 — for now, accept this temporary breakage.

Optional: add a tiny shim in `validate-emit.ts` that adapts the new shape back to the old for the legacy import path. Snippet:

```typescript
const importRef = r.validator.kind === 'import' ? r.validator : null;
if (!importRef) {
  // 'inline' validators are handled in Task C.3; skip them here.
  continue;
}
const key = `${importRef.module}::${importRef.exportName}`;
// ... existing logic ...
```

Apply this shim now so compiler tests stay green; the inline path lands in Task C.3.

- [ ] **Step 7: Verify compiler + parser + IR gate all green**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run test -w "@parser2/parser" 2>&1 | grep -E "^# (tests|pass|fail)"
npm run test -w "@parser2/compiler" 2>&1 | grep -E "^# (tests|pass|fail)"
```

Expected: parser 81 pass, compiler 374 pass.

- [ ] **Step 8: Commit**

```bash
git add packages/parser/src/types.ts packages/parser/src/validation.ts packages/parser/test/validation-with-schemadef.test.ts packages/compiler/src/emit/v2/validate-emit.ts
git commit -m "feat(parser): defineValidation.validate accepts SchemaDef (inline composition)

Broadens ValidationRuleDef.validator into a tagged union of 'import'
(legacy external-module reference) and 'inline' (sub-schema embedded in
the parent). The existing import path still works unchanged; the inline
path is wired into emit in the next commit. compiler/emit/v2/validate-emit
gets a temporary shim that skips inline validators until then."
```

### Task C.3: Implement inline composition in validate-emit

**Files:**
- Modify: `packages/compiler/src/emit/v2/validate-emit.ts`
- Modify: `packages/compiler/src/emit/v2/index.ts` (if necessary, to expose what's needed)
- Create: `packages/compiler/test/inline-validator-composition.test.ts`

- [ ] **Step 1: Write the failing integration test**

```typescript
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { generateParser } from '../src/index.ts';
import { defineSchema, defineValidation, parse, relation, span } from '@parser2/parser';

import { $, defineSchema, defineValidation, literal, parse, relation, span } from '@parser2/parser';

const colorMini = defineSchema({
  rootType: 'MiniColor',
  punctuators: {},
  tokens: [],
  examples: [
    relation('MiniColor', {
      input: 'red',
      encodings: {
        parse: parse([span('value', 'red').ident().css().oneOf(['red', 'green', 'blue'])]),
        ast: { type: 'mini-color', value: $.value },
      },
    }),
  ],
});

const parent = defineSchema({
  rootType: 'Decl',
  punctuators: { colon: ':' },
  tokens: [],
  examples: [
    relation('Decl', {
      input: 'color: red',
      encodings: {
        parse: parse([
          span('prop', 'color').ident().css(),
          literal(':'),
          span('value', 'red').until('\\n'),
        ]),
        ast: { type: 'decl', prop: $.prop, value: $.value },
      },
    }),
  ],
});

const validation = defineValidation(parent)
  .node('Decl').field('value').match('prop', ['color']).validate(colorMini)
  .build();

test('codegen inlines sub-schema as validator with unique prefix', async () => {
  const source = generateParser(parent, validation, { packageName: 'host' });
  // The host parser should contain the sub-schema's parseMiniColor with a
  // unique prefix and an alias __validator_0 that calls it.
  assert.match(source, /function __\w+_parseMiniColor/);
  assert.match(source, /function __validator_0/);
  // Materialize and exercise:
  const mod = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  assert.doesNotThrow(() => mod.validate('color: red', { validate: true }));
  assert.throws(() => mod.validate('color: purple', { validate: true }));
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run test -w "@parser2/compiler" 2>&1 | tail -10
```

- [ ] **Step 3: Add emitMode option (needed by Step 4)**

In `packages/compiler/src/index.ts` GenerateOptions:

```typescript
readonly emitMode?: 'standalone' | 'inline';
```

In `packages/compiler/src/model.ts` InferredSchema:

```typescript
readonly emitMode: 'standalone' | 'inline';
```

In `packages/compiler/src/index.ts` inferSchema():

```typescript
emitMode: options.emitMode ?? 'standalone',
```

In `packages/compiler/src/emit/v2/index.ts`, suppress the final `export function parse / validate / etc.` block when `schema.emitMode === 'inline'`. Also suppress the file header and `// @ts-nocheck` (they're handled by the parent).

- [ ] **Step 4: Implement inline composition in validate-emit.ts**

The strategy:
1. Collect all inline validator rules (`r.validator.kind === 'inline'`).
2. For each unique sub-schema (deduplicate by reference identity), assign a prefix `__v${N}_` where N is the order of first appearance.
3. Recursively call the v2 backend's emit with `symbolPrefix: prefix` and `packageName` derived from `schema.rootType`. Capture the emitted source.
4. STRIP the public `export function parse / export function validate` lines from the sub-schema's emitted source (they collide with the parent's exports). Keep only the internal functions.
5. Strip the file header and `// @ts-nocheck` (they're already on the parent).
6. Concatenate all sub-schema sources into a "Inlined validators" block placed BEFORE the parent's tokenizer (i.e., between header and parse functions).
7. Emit an alias for each rule: `function __validator_N(input) { __vM_parseRoot({ ...state for input... }); }` — match the pattern in the current generated parser at lines 2475-2477.
8. The existing validate() emission uses these `__validator_N` aliases — no change needed there.

The trickiest step is (4). The v2 backend emits `export function parse` etc. at the end. Extract everything UP TO that point, OR add a `emitMode: 'inline' | 'standalone'` to InferredSchema that suppresses exports when in 'inline' mode. The latter is cleaner — add it to GenerateOptions + InferredSchema, default 'standalone'.

Implementation outline for `emitInlineValidators(schema)`:

```typescript
function emitInlineValidators(schema: InferredSchema): { source: string; aliases: Map<number, string> } {
  const rules = schema.validation?.rules ?? [];
  const inlineRules = rules.filter((r): r is InlineRule => r.validator.kind === 'inline');
  if (inlineRules.length === 0) return { source: '', aliases: new Map() };

  // Deduplicate by SchemaDef reference identity.
  const seen = new Map<SchemaDef, { prefix: string; index: number }>();
  let nextIdx = 0;
  for (const r of inlineRules) {
    if (!seen.has(r.validator.schema)) {
      const prefix = `__v${nextIdx}_`;
      seen.set(r.validator.schema, { prefix, index: nextIdx });
      nextIdx += 1;
    }
  }

  // Compile each sub-schema with its prefix in 'inline' emit mode.
  const sources: string[] = [];
  const aliases = new Map<number, string>();
  let validatorIdx = 0;
  for (const r of inlineRules) {
    const { prefix, index } = seen.get(r.validator.schema)!;
    if (!aliases.has(index)) {
      const subSource = generateParser(r.validator.schema, undefined, {
        packageName: r.validator.schema.rootType,
        symbolPrefix: prefix,
        emitMode: 'inline',
      });
      sources.push(`// ── Inlined validator: ${r.validator.schema.rootType} (prefix ${prefix}) ──\n${subSource}`);
    }
    // Each rule gets its own __validator_N alias even if the sub-schema is reused.
    const rootParseFn = `${prefix}parse${r.validator.schema.rootType}`;
    aliases.set(validatorIdx, `function __validator_${validatorIdx}(input: string): void {
  const __state: State = { input, len: input.length, pos: 0, maxOff: 0, mode: 'fast', lineStarts: [] };
  const __r = ${rootParseFn}(__state);
  if (__r === null || __state.pos !== input.length) {
    throw syntaxErrorAt(input, __state.maxOff > __state.pos ? __state.maxOff : __state.pos);
  }
}`);
    validatorIdx += 1;
  }

  const aliasBlock = Array.from(aliases.values()).join('\n');
  return { source: `${sources.join('\n')}\n${aliasBlock}`, aliases };
}
```

In `emit/v2/index.ts`, after the header and before the main body, splice in the result of `emitInlineValidators(schema)`. The existing validate() emission needs to be reconciled: it iterates `rules` and generates `__validator_N` reference calls based on order. Make sure the ordering matches between rule-emission and alias-creation.

- [ ] **Step 5: Run the failing test**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run test -w "@parser2/compiler" 2>&1 | tail -10
```

Expected: PASS. If symbol collisions surface, double-check that EVERY function name in v2/index.ts respects schema.symbolPrefix.

- [ ] **Step 6: Run ALL test suites to confirm no regression**

```bash
cd /Users/valerii/Develop/parser3_codex
for pkg in parser compiler css html markdown cron yaml-block; do
  npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '
  echo " <- $pkg"
done
```

Expected: all green. Specifically the IR gate (parser package) must pass — no existing generated parser changes since we didn't yet regen anything.

- [ ] **Step 7: Commit**

```bash
git add packages/compiler/src/index.ts packages/compiler/src/model.ts packages/compiler/src/emit/v2/index.ts packages/compiler/src/emit/v2/validate-emit.ts packages/compiler/test/inline-validator-composition.test.ts
git commit -m "feat(compiler): inline SchemaDef validators via composed codegen

Implements 'compose schemas' end-to-end on the v2 backend:

  - New emitMode='inline' suppresses public exports + file header so a
    sub-schema's parser can be embedded inside a parent's source.
  - validate-emit detects 'inline' validator rules, compiles each
    referenced SchemaDef with a unique symbolPrefix (__vN_), and inlines
    the source. Each rule gets an __validator_N alias that runs the
    sub-schema's root parse fn.
  - Integration test exercises end-to-end materialization and validate()
    accept/reject behavior.

Engine invariant: any schema NOT using inline validators emits byte-
identical output to before (IR gate verifies the 5 in-scope generated
parsers are unchanged)."
```

---

## Phase D: Wire validators into CSS schema + regen + golden bump

Restore the CSS schema's validation chain to reference the resurrected sub-schemas, regenerate the css parser end-to-end, and bump the IR golden.

### Task D.1: Restore CSS validation chain

**Files:**
- Modify: `packages/css/src/schema.ts` (top imports + lines ~380-388)

- [ ] **Step 1: Read the current state**

```bash
cd /Users/valerii/Develop/parser3_codex
sed -n '1,10p' packages/css/src/schema.ts
sed -n '380,387p' packages/css/src/schema.ts
```

- [ ] **Step 2: Update imports**

At top of `packages/css/src/schema.ts`, add:

```typescript
import colorSchema from './validators/color.ts';
import lengthPercentageSchema from './validators/length-percentage.ts';
```

Remove the now-stale comment (lines 3-7 about "Task 9.11" inlined validators).

- [ ] **Step 3: Replace the empty validation chain**

The current `export const validation: ValidationDef = defineValidation(cssSchema);` is a no-op stub. Replace with the original-style chain that references the two sub-schemas. The original chain (from `git show b65ebcf~1:packages/css/src/schema.ts | sed -n '/defineValidation/,/build/p'`) was approximately:

```typescript
export const validation: ValidationDef = defineValidation(cssSchema)
  .node('Decl').field('value').match('property', COLOR_PROPS).validate(colorSchema)
  .node('Decl').field('value').match('property', LENGTH_PROPS).validate(lengthPercentageSchema)
  .build();
```

If the actual original chain used different fields/matches, prefer the original — pull it from `git show b65ebcf~1:packages/css/src/schema.ts` and adapt.

- [ ] **Step 4: Update comment block at top**

Remove the Task 9.11 inline-validators comment block. Replace with a short note:

```typescript
// Sub-schemas under ./validators/ provide property-value validation. They
// are SchemaDef objects; the compiler composes them into the generated
// parser via inline-validator emission (see compiler/emit/v2/validate-emit).
```

- [ ] **Step 5: Typecheck**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run build -w "@parser2/css" 2>&1 | tail -10
```

Expected: clean.

- [ ] **Step 6: Run css tests (the OLD generated parser still applies)**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run test -w "@parser2/css" 2>&1 | tail -10
```

Expected: still passes (we haven't regen'd yet; the old parser hasn't changed). If something fails here, the schema change broke source-level invariants.

- [ ] **Step 7: Commit**

```bash
git add packages/css/src/schema.ts
git commit -m "feat(css): restore validation chain using local sub-schemas

Wires up colorSchema and lengthPercentageSchema as inline validators on
Decl.value for COLOR_PROPS and LENGTH_PROPS respectively. The compiler's
inline-validator pass (Phase C) will compose them into the regenerated
parser. Generated parser regen happens in the next commit."
```

### Task D.2: Regenerate CSS parser

**Files:**
- Modify: `packages/css/src/_generated/parser.ts` (full overwrite)

- [ ] **Step 1: Backup the current generated parser for comparison**

```bash
cp packages/css/src/_generated/parser.ts /tmp/css-parser-before.ts
```

- [ ] **Step 2: Regenerate**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run generate -w "@parser2/css" 2>&1 | tail -20
```

Expected: `generated packages/css/src/_generated/parser.ts`.

- [ ] **Step 3: Inspect what changed**

```bash
diff -u /tmp/css-parser-before.ts packages/css/src/_generated/parser.ts | head -80
wc -l /tmp/css-parser-before.ts packages/css/src/_generated/parser.ts
```

Expected: the new file replaces the hand-edited `__cc_/__cl_` block with codegen-emitted `__v0_/__v1_` inline validators. The total line count should be in the same order of magnitude (~6200 lines), but the structure is regenerated.

- [ ] **Step 4: Run css tests**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run test -w "@parser2/css" 2>&1 | tail -10
```

Expected: 56 pass + 1 skip. If the tests fail, the regenerated parser has behavior drift vs the hand-edited one. Common causes: missing inlined runtime helper, validator dispatch ordering, symbol collisions. Debug and fix in the codegen, NOT in the generated file.

- [ ] **Step 5: Run all suites for cross-regression**

```bash
cd /Users/valerii/Develop/parser3_codex
for pkg in parser compiler css html markdown cron yaml-block; do
  npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '
  echo " <- $pkg"
done
```

Expected: parser FAILS (the css golden hash no longer matches), every other package passes. The next task updates the golden.

- [ ] **Step 6: Cleanup**

```bash
rm /tmp/css-parser-before.ts
```

- [ ] **Step 7: Commit**

```bash
git add packages/css/src/_generated/parser.ts
git commit -m "chore(css): regenerate parser with composed validators

First clean regen of the css package since Task 9.11. The previously
hand-inlined __cc_/__cl_ validator block is replaced by codegen-emitted
__v0_/__v1_ inline validators sourced from packages/css/src/validators/
{color,length-percentage}.ts. css test suite (56+1 skip) remains green.

The IR golden hash will diverge from the previous value; bumped in the
follow-up commit."
```

### Task D.3: Bump IR golden hash

**Files:**
- Modify: `packages/parser/test/generated-parser-ir.golden.json`

- [ ] **Step 1: Compute the new css hash**

```bash
cd /Users/valerii/Develop/parser3_codex
node -e "const c=require('crypto'); const fs=require('fs'); console.log(c.createHash('sha256').update(fs.readFileSync('packages/css/src/_generated/parser.ts')).digest('hex'));"
```

Expected: prints a new SHA256 different from `0c9363dacf6b9342fbf24b30889090da04a489405ccf5258e4df23220599c733`.

- [ ] **Step 2: Update the golden JSON**

Read `packages/parser/test/generated-parser-ir.golden.json`, replace the `css` value with the new hash from Step 1. Keep other hashes (html, markdown, cron, yaml-block) unchanged.

- [ ] **Step 3: Run parser tests**

```bash
cd /Users/valerii/Develop/parser3_codex
npm run test -w "@parser2/parser" 2>&1 | tail -5
```

Expected: 81/81 (or 80/80 if Task C.2's new test is in the parser package). All green.

- [ ] **Step 4: Run ALL suites for final confirmation**

```bash
cd /Users/valerii/Develop/parser3_codex
for pkg in parser compiler css html markdown cron yaml-block; do
  npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '
  echo " <- $pkg"
done
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add packages/parser/test/generated-parser-ir.golden.json
git commit -m "test(parser): bump css golden hash after regen with composed validators

The css generated parser was regenerated in the previous commit using
inline-validator composition (Phase 10 follow-up #1). Old golden:
0c9363dacf6b9342fbf24b30889090da04a489405ccf5258e4df23220599c733
captured the hand-edited post-9.11 file. New golden captures the
regenerated file."
```

---

## Phase E: Docs + closeout

### Task E.1: Mark Phase 9 follow-up #1 resolved

**Files:**
- Modify: `docs/v2-migration-status.md`

- [ ] **Step 1: Find the Phase 9 follow-up #1 entry**

```bash
cd /Users/valerii/Develop/parser3_codex
grep -n "follow-up #1\|CSS regen\|Phase 9 follow-up" docs/v2-migration-status.md | head -10
```

- [ ] **Step 2: Annotate the entry**

Append below the existing entry text:

```markdown
**Status: Resolved (<COMMIT_SHA>, 2026-05-29)** — Path (a) realized. css-color and css-length-percentage resurrected on relation() DSL as `packages/css/src/validators/{color,length-percentage}.ts` sub-modules. Codegen extended with `symbolPrefix` + `emitMode: 'inline'` options and an inline-validator composition pass in v2 emit. CSS parser regenerated cleanly; IR golden bumped accordingly. See plan `docs/superpowers/plans/2026-05-29-css-validator-schemas-resurrection.md`.
```

Use the SHA of the regen commit (Task D.2) for COMMIT_SHA.

- [ ] **Step 3: Commit**

```bash
git add docs/v2-migration-status.md
git commit -m "docs: Phase 9 follow-up #1 resolved (CSS validator composition)

Marks the CSS regen unlock as Resolved via path (a) — full schema-
composition realization. Engine now supports inline SchemaDef validators
end-to-end, demonstrated by the css package's color + length-percentage
sub-schemas."
```

---

## Final verification

- [ ] **Run the full suite end-to-end and confirm green**

```bash
cd /Users/valerii/Develop/parser3_codex
for pkg in parser compiler css html markdown cron yaml-block; do
  npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '
  echo " <- $pkg"
done
git status
git log --oneline | head -15
```

Expected:
- parser ≥ 80 tests, all pass
- compiler ≥ 375 tests, all pass
- css 56 pass + 1 skip
- html 34 pass
- markdown 76 pass
- cron 15 pass
- yaml-block 9 pass
- clean tree
- ~10-12 new commits

---

## Out of scope / explicitly deferred

- **Bytecode backend support for inline validators.** This plan touches only the v2 (TS) backend. The bytecode backend retains its existing behavior (no validator emission). Tracked alongside Phase 8 follow-up #1.
- **Sub-schema source target.** Both sub-schemas are AST-only (no `source` target), matching the original css-color and css-length-percentage constraints. Adding source-target round-trip is a future task if any caller needs to re-serialize colors/lengths from AST.
- **`.lengths()` hex-color refinement.** The original css-color schema had a TODO note "restore .lengths([3, 4, 6, 8]) once the v2 compiler emits the refinement." If `.lengths()` isn't implemented in the current compiler, hash colors like `#12` or `#123456789` will parse — preserving the prior behavior. Tracked alongside Phase 1.5 closeout.
- **Documenting the new compose-schemas API.** A README addition under `packages/parser/` explaining `defineValidation.validate(SchemaDef)` would be valuable but is not blocking. Deferred.
