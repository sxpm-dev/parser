# Phase 9 — `relation()` DSL clean break (design)

Status: design draft, awaiting approval. Author: Claude (Opus 4.7).
Anchors the Phase 9 task plan in `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md` lines 797–838.

## Goal

Rename and reshape the user-facing schema DSL from `ex(input).as(NodeType).span(...).render(...).build()` to a declarative `relation(NodeType, { input, encodings })` form. Cosmetic on top of the proven engine — generated parsers must be **byte-identical** before and after the rewrite. Phase 9 is the last phase of the bidirectional-engine overhaul.

## Non-goals

- No engine changes. `packages/compiler/src/` stays untouched.
- No semantic changes to parse, render, fusion, or runtime behavior.
- No performance regression — bench-parity is an exit gate.
- No new features in the DSL — every construct expressible today must remain expressible (with mechanically-equivalent IR output).
- The 8 out-of-scope packages (`arn`, `js`, `log`, `mac`, `proto`, `url`, `css-color`, `css-length-percentage`) are deleted, not rewritten.

## Public API surface

Five exported constructors replace `ex()`. `defineSchema(...)` is unchanged.

```ts
relation(nodeType: string, body: RelationBody): ExampleDef
parse(items: ReadonlyArray<Span | Literal>): ParseProgram
span(name: string, exampleText?: string): SpanNode
literal(text: string): Literal
tpl`...${$.name}...`  // unchanged
```

`RelationBody`:

```ts
{
  input: string;
  encodings: {
    [target: string]: ParseProgram | Template | AstShape;
  };
  status?: { kind: 'valid' }
         | { kind: 'recovered'; policy: RecoveryPolicy }
         | { kind: 'rejected' };
}
```

Each `relation(...)` call returns one `ExampleDef`. Multiple calls with the same `nodeType` accumulate into productions of that node type at the schema level — the schema author collects them in `defineSchema({ examples: [...] })` exactly as today.

Note on two `parse` symbols: the schema-author `parse(items)` (imported from `@parser2/parser`, builds a `ParseProgram` for the `md`/`source`/`text` encoding slot) is distinct from the per-package runtime `parse(input, options)` exported from each `_generated/parser.ts`. They live in different import sources and are never imported into the same file — schema-authoring code imports `@parser2/parser`; consumers import e.g. `@parser2/markdown`. See "Open questions" for the naming-collision review.

Runtime API rename: `parse(input, { target: 'md' })` instead of `{ type: 'md' }`; same for `render(input, { target: ... })`. The schema-level `defaultTarget` field is preserved. (This rename applies to the runtime functions exported from each in-scope package's `_generated/parser.ts`, not to the schema-author `parse(items)` constructor.)

### Span node API

`span(name, exampleText?)` returns an immutable `SpanNode`. Every chained method returns a NEW `SpanNode` (no mutation). Methods fall into four groups:

- **Classes** (exactly one wins, set by chained methods): `.literal()` `.ident()` `.number()` `.string()` `.hex()` `.regex()` `.template()` `.comment()` `.whitespace()` `.keyword(text)` `.operator(alts?)`.
- **Refinements** (additive, chain after class): `.int()` `.float()` `.bigint()` `.binary()` `.octal()` `.scientific()` `.separator(ch)` `.singleQuoted()` `.doubleQuoted()` `.backtick()` `.hexString()` `.lengths([...])` `.urlString()` `.css()` `.js()` `.html()` `.oneOf([...])` `.line(marker)` `.block(open, close)`.
- **Modifiers** (additive): `.optional()` `.repeats({sep?, trailing?, min?, max?, stopBefore?})` `.until(stops, opts?)` `.rawUntil(stops, opts?)` `.noLineTerminatorAfter()` `.noWhitespaceAfter()` `.requireSpaceAfter()` `.indent()`.
- **Role declaration** (replaces today's positional 3rd arg): `.of(...roles)` — varargs string roles for recursive spans. `span('children', text).of('Role1', 'Role2').repeats({ min: 0 })` is the new shape for today's `.span('children', text, ['Role1', 'Role2']).repeats({ min: 0 })`.

`literal(text)` is sugar — equivalent to an unnamed `span(undefined, text).literal()` but a narrower TypeScript type so the parse-program list `Array<Span | Literal>` documents which entries name captures and which anchor positions.

`tpl` and `$` are unchanged.

### Worked examples

```ts
// MarkdownHeading h1
relation('MarkdownLeaf', {
  input: '# Release notes',
  encodings: {
    md: parse([
      literal('#'),
      span('text', 'Release notes').until('\n', { balanced: false }),
    ]),
    ast: { type: 'heading', depth: 1, text: $.text },
    html: tpl`<h1>${$.text}</h1>`,
    source: tpl`# ${$.text}`,
  },
});

// MarkdownDocument (recursive children)
relation('MarkdownDocument', {
  input: '# Release notes\nPlain paragraph',
  encodings: {
    md: parse([
      span('children', '# Release notes\nPlain paragraph')
        .of('MarkdownLeaf', 'MarkdownParagraph')
        .repeats({ min: 0 }),
    ]),
    ast: { type: 'document', children: $.children },
    html: tpl`${$.children}`,
    source: tpl`${$.children}`,
  },
});

// Italic *italic* (hug-class punctuators)
relation('MarkdownLeaf', {
  input: '*italic*',
  encodings: {
    md: parse([
      literal('*'),
      span('text', 'italic').until('*', { balanced: false }),
      literal('*'),
    ]),
    ast: { type: 'italic', text: $.text },
    html: tpl`<em>${$.text}</em>`,
    source: tpl`*${$.text}*`,
  },
});
```

## IR translation

`relation(...)` produces a value structurally equivalent to today's `ExampleDef`. The compiler downstream is untouched.

| New DSL value | Becomes (current IR) |
|---|---|
| `relation('NodeType', { input, encodings, status? })` | One entry in `schema.examples` with `nodeType`, `input`, `status` |
| `parse([...items])` slot | `spans: SpanDef[]` (one per item) — exactly one parse-program slot allowed per relation |
| `literal('#')` item | `SpanDef { class: 'literal', text: '#', name: undefined }` |
| `span(name, text).class().refinements().modifiers()` | `SpanDef { name, text, class, refinements, modifiers }` |
| `.of(roles)` modifier | Sets `recursiveRoles: [...roles]` |
| Encoding value matching `isParseProgram(v)` | The forward parse program (consumed for spans; not added to renders) |
| Encoding value matching `isTemplate(v)` | `RenderTargetDef { target, body: template }` |
| Encoding value that's a plain object | `RenderTargetDef { target, body: object }` |
| Omitted `status` | `{ kind: 'valid' }` |

**Cross-validation**: at relation construction (module load time), the compiler validates that `input` is consistent with the parse program by parsing `input` against the program and asserting every literal anchor and every named-span example text aligns with the source slices the parse produces. The spike defers this check — Task 9.1 will implement it. The remaining open question (below) is hard-fail vs warn.

## Spike findings

The spike in `packages/parser/test/spike-relation.test.ts` validates the IR translation for four representative production shapes:

1. **MarkdownHeading h1** — literal + named capture + `.until()` + 3 render targets.
2. **MarkdownDocument** — recursive `.of('Role1', 'Role2').repeats({ min: 0 })` on a single span.
3. **Italic `*italic*`** — hug-class punctuators where input reconstruction (without an explicit `input:` field) fails. This case drove the design revision restoring `input:` as a required top-level field.
4. **Thematic break `***`** — pure literal single span, no captures.

All four `assert.deepEqual(viaRelation, viaEx)` checks pass. The IR is mechanically equivalent.

**Important spike finding (drove a design revision):** an initial design tried to drop the explicit `input:` field and reconstruct it from the parse program. This failed on hug-class punctuators (`*italic*`, `[label](url)`, `<tag>`, etc. — ~half of markdown examples and large portions of css/html). The `input:` field is restored as a required top-level field on `relation(...)`; the parse program continues to carry per-span example texts for inference; the compiler cross-validates them.

## Testing strategy & exit gates

In priority order:

1. **IR round-trip equivalence**: for every current example in css/html/markdown/cron/yaml-block, `assert.deepEqual(exampleViaEx(...), exampleViaRelation(...))`. Lives in `packages/parser/test/relation.test.ts`.

2. **Generated-parser byte equality**: for each in-scope package, hash `_generated/parser.ts` before the schema rewrite; after rewrite + regen, assert hash equality:

   ```bash
   sha256sum packages/markdown/src/_generated/parser.ts > /tmp/md.before
   # rewrite schema.ts onto relation(...); then:
   npm run generate -w @parser2/markdown
   sha256sum packages/markdown/src/_generated/parser.ts | diff - /tmp/md.before
   # must produce empty diff
   ```

3. **Existing test suites stay green**:
   - parser ≥ 30 (will increase with relation tests)
   - compiler 372/372
   - css 56+1 skip
   - html 34/34
   - markdown 76/76
   - cron 15/15
   - yaml-block 9/9

4. **New builder validation tests** (`packages/parser/test/relation.test.ts`): every method on `span`, `literal`, `parse`, `relation` gets at least one test. Edge cases — pure-literal productions (`***`), multi-line (setext, fenced code), recursive (`children`), `.until(...)`-only (paragraph), nested `.indent()` (yaml-block) — covered explicitly.

5. **Bench parity** (recommended, optional): `packages/css/bench/perf.bench.ts` before/after — no hz regression on 5KB/20KB/100KB inputs.

### Phase 9 exit gate (when we declare Phase 9 done)

- All 5 in-scope schemas rewritten onto `relation(...)`: `css`, `html`, `markdown`, `cron`, `yaml-block`.
- `ex()` and all related types deleted from `packages/parser/src/`.
- All test suites green at the expected counts.
- All generated parsers byte-identical to their pre-rewrite hashes.
- 8 out-of-scope packages deleted: `arn`, `js`, `log`, `mac`, `proto`, `url`, `css-color`, `css-length-percentage`.
- `docs/v2-migration-status.md` § "Phase 9 closeout" written.

## Open questions & risks

- **Cross-validation strictness**: should the compiler hard-fail when `input` and the parse program disagree, or warn? Recommendation: hard-fail at module load so schema drift is impossible. To be confirmed in Task 9.1.
- **Encoding-order stability**: the spike preserves insertion order of the `encodings:` object. JavaScript's `Object.entries` returns insertion order for string keys, so this is portable on modern engines. Documented expectation, not asserted.
- **`parse` constructor naming collision**: the existing top-level `parse(input, opts?)` function (in generated parsers) and the new `parse(items)` constructor share a name in the schema-authoring context. Resolution: the schema-author `parse` lives only in `@parser2/parser`'s exports; the generated-parser `parse` lives in each package's `_generated/parser.ts`. No file imports both. To be confirmed when the relation.ts source lands.
- **Migration risk**: 80+ examples across 5 schemas need rewriting. Each rewrite must produce byte-identical generated parsers. Risk mitigation: per-package, one PR per schema, with the SHA256 gate enforcing correctness.
