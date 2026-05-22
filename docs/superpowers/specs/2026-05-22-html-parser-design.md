# @parser2/html — long-term design

Status: design approved 2026-05-22. Phase I is the active work stream.
Phases II–V are roadmap; out of this work stream.

## Goal

Make `@parser2/html` an HTML parser whose output is structurally equivalent to
[parse5](https://github.com/inikulin/parse5), within the constraints of the
example-first schema DSL and the domainless compiler.

Long term target: **Full WHATWG HTML5**, matching parse5's tree on real-world
input. Reached via a staged roadmap; only Phase I is committed work.

## Constraints

These are project-level invariants the design respects.

1. **Schema-only work in this stream.** Parser/codegen is treated as done.
   Anything missing from the DSL is parked for a separate work stream — never
   inlined as compiler hacks.
2. **Domainless compiler.** No `if (schema.name === 'html')` paths anywhere.
   New DSL primitives, when proposed in the parking lot, must be generic
   (recur across languages) per the admission policy in
   `packages/compiler/README.md`.
3. **`src/index.ts` is a pure re-export** of `./_generated/parser.ts`. No
   package-local adapters, validators, or post-parse helpers.
4. **AST shape is parse5-compatible** (modulo limitations in §5).
5. **`huge-page.html` is the long-term acceptance fixture**, but it stays
   broken in Phase I (it requires a raw-text content primitive, which is
   parked for Phase II).

## 1. Scope per phase

| Phase | Scope | Status |
|---|---|---|
| **I** | Structural HTML — nested elements, comments, doctypes, void elements, attribute-quoting variants, whitespace-preserving text, parse5-shape AST. Schema-only work using the currently documented DSL. | **Active** |
| II | DSL design + schema work for raw-text content (`<script>`/`<style>`/`<textarea>`/`<title>`) and arbitrary unquoted attribute values. | Parked |
| III | DSL design + schema work for implicit-close insertion modes (`<li>`/`<tr>`/`<p>` auto-close). | Parked |
| IV | DSL design + schema work for foster-parenting, head/body injection, foreign content (SVG/MathML). | Parked |
| V | Compiler-emit performance work using existing primitives only (first-token-lookahead dispatch, lazy capture, direct-fast scanner shape detection). Allowed once Phase I schema lands. | Parked until Phase I done |

Each phase delivers a usable parser with documented limitations relative to
parse5. Each phase finishes with a perf/size baseline relock.

## 2. Phase I node-type catalogue

The schema is a single `defineSchema({ name: 'html', rootType: 'HtmlDocument', ... })`
because Element ↔ Comment ↔ Doctype ↔ TextNode are mutually recursive.

| Node type | Productions | Purpose |
|---|---|---|
| `HtmlDocument` | 1 | Root. Holds a list of top-level children. |
| `Doctype` | 1 (multi-variant via optional spans) | `<!DOCTYPE html>` and `<!DOCTYPE html PUBLIC "..." "...">` shapes. |
| `Element` | 1 | Open tag, attributes, recursive children, close tag with matching name. |
| `VoidElement` | 1 | Open tag with name ∈ `VOID_TAGS`; no close tag, no children. |
| `Comment` | 1 | `<!-- ... -->`. |
| `TextNode` | 1 | Opaque source slice up to the next `<`. |
| `Attribute` | 4 | Double-quoted, single-quoted, ident-unquoted, boolean. |

### 2.1 Multi-production dispatch order (parent: children list of an element/document body)

Productions are tried in order; the first to succeed wins.

1. `Comment` — disambiguated by `<!--` longest-prefix punctuator.
2. `Doctype` — disambiguated by `<!` (with no `--` following).
3. `VoidElement` — `.oneOf(VOID_TAGS)` rejects names outside the void set.
4. `Element` — catches the remaining `<tagname>` shapes.
5. `TextNode` — fallback for anything not starting with `<`.

This ordering relies on `.oneOf()` rejecting non-matching tags so dispatch
falls through to `Element` for non-void names.

### 2.2 Void element set

```
area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr
```

Encoded as `.span('tag', 'br').ident().css().oneOf(VOID_TAGS)`. The closed
list matches the WHATWG void-element list.

## 3. Output shape (parse5-compatible subset)

Each `.structure({...})` literal produces parse5-shaped output:

```ts
// document
{ nodeName: '#document', mode: 'no-quirks', childNodes: $.children, parentNode: null }

// doctype
{ nodeName: '#documentType', name: $.name, publicId: $.publicId, systemId: $.systemId, parentNode: null }

// element
{ nodeName: $.tag,
  tagName: $.tag,
  namespaceURI: 'http://www.w3.org/1999/xhtml',
  attrs: $.attributes,
  childNodes: $.children,
  parentNode: null }

// void element
{ nodeName: $.tag,
  tagName: $.tag,
  namespaceURI: 'http://www.w3.org/1999/xhtml',
  attrs: $.attributes,
  childNodes: [],
  parentNode: null }

// comment
{ nodeName: '#comment', data: $.text, parentNode: null }

// text
{ nodeName: '#text', value: $.text, parentNode: null }

// attribute
{ name: $.name, value: $.value }   // value defaults to '' for boolean attrs
```

### 3.1 Known deltas vs parse5

| Field | parse5 | Phase I |
|---|---|---|
| `parentNode` | object reference (cycle) | always `null` |
| `namespaceURI` | varies for SVG/MathML | always `'http://www.w3.org/1999/xhtml'` |
| `sourceCodeLocation` | per-node `{startLine, startCol, startOffset, endLine, endCol, endOffset, ...}` | auto-attached `source: {start, end}` with `{line, column, offset}` sub-positions; only when `mode: 'raws'` is requested |
| Document `mode` | `'no-quirks' | 'quirks' | 'limited-quirks'` | hardcoded `'no-quirks'` |
| Tag-name / attribute-name case | normalized lowercase | preserved as written (`<DIV>` → `nodeName: 'DIV'`) |

The conformance harness either masks these fields or lowercases ours before
comparing. Case normalization itself is parked — see §10 — because the
schema's structure literal cannot transform a `$.tag` capture.

## 4. Schema declarations

```ts
{
  name: 'html',
  rootType: 'HtmlDocument',
  whitespace: 'preserve',
  punctuators: {
    commentOpen:  '<!--',
    commentClose: '-->',
    doctypeOpen:  '<!',
    closeTagOpen: '</',
    selfClose:    '/>',
    lt:           '<',
    gt:           '>',
    equals:       '=',
    slash:        '/',
  },
  tokens: ['string', 'whitespace', 'comment'],
  examples: [/* ... */],
}
```

- Multi-char punctuators (`<!--`, `-->`, `<!`, `</`, `/>`) are listed so
  longest-match wins. `<!--` must come before `<!`; `-->` before `>`.
- `whitespace: 'preserve'` keeps text content significant. (Per project
  constraint, treat this as implemented in codegen.)
- `string` token class lets attribute-value tokens scan correctly inside
  attribute lists.

## 5. Phase I example coverage (target list)

These are the examples to write. Each is one `.as(Type)` production unless
multi-production is noted.

### `HtmlDocument`
- Empty document with single root element.
- Doctype + element root.
- Comment + element root.
- Mixed text + element + comment at top level.

### `Doctype`
- `<!DOCTYPE html>` (HTML5 short form, case-insensitive keyword).
- `<!DOCTYPE html PUBLIC "..." "...">` (legacy long form).

### `Element` (must demonstrate)
- `<p>text</p>` — single text child.
- `<div><span>x</span></div>` — nested elements.
- `<a href="/x">link</a>` — single attribute, double-quoted.
- `<div class="a" id="b" data-x="c">…</div>` — multiple attributes.
- `<p>before<em>x</em>after</p>` — mixed text/element children.
- Element where open and close tag names must match (verified via examples).

### `VoidElement`
- `<br>`.
- `<meta charset="utf-8">`.
- `<img src="x.png" alt="">`.
- `<br />` (self-closing slash tolerated; same structure as `<br>`).

### `Comment`
- `<!-- hello -->`.
- Multi-line comment.

### `TextNode`
- Plain text run until next `<`.
- Text containing `>` (allowed) and `&` (treated as literal; entity decoding
  is parked).

### `Attribute` (multi-production, 4 productions)
- `class="hero"` — double-quoted.
- `class='hero'` — single-quoted.
- `class=hero` — unquoted ident-shape (`.ident().css()`).
- `disabled` — boolean.

## 6. Recovery policies (Phase I)

Using `.recovers({syncAt, drop})` from the documented DSL. Assumes recovery
codegen is implemented.

1. **Malformed attribute** — on the `Attribute` production:
   ```
   .recovers({ syncAt: ['>', '/>'], drop: 'attribute' })
   ```
   Produces `{name: <best-effort>, value: null}` and continues with the next
   attribute or tag close.

2. **Tag-name mismatch on close** — on the `Element` production:
   ```
   .recovers({ syncAt: ['>'], drop: 'mismatched-close' })
   ```
   Returns the element with its parsed children; the mismatched close-tag
   token is consumed up to `>` and discarded.

3. **Unclosed element at EOF** — on the `Element` production. The exact
   `.recovers({...})` invocation depends on how the recovery codegen models
   EOF as a sync point. If `syncAt` is restricted to literal tokens, the
   intent is "if the close-tag span never matches and input is exhausted,
   produce the element with the children parsed so far rather than throwing".
   This becomes a Phase I implementation detail confirmed against the
   recovery codegen.

Phase I does NOT model implicit closes (`<li>` auto-closing on next `<li>`,
etc.). Those require either richer recovery semantics or a new DSL primitive;
both are parked for Phase III.

## 7. Conformance harness

`scripts/html-compare.ts` (already exists) becomes the harness. Generalized to:

- Walk parse5 tree and ours in parallel via a structural diff.
- Mask Phase I deltas: `parentNode`, `sourceCodeLocation`, document `mode`,
  `namespaceURI` for non-foreign elements (always xhtml ns).
- Report first divergence with source-line context.
- Drive a fixture corpus (§8).

A new test file `packages/html/test/conformance.test.ts` runs the harness
across every fixture in the corpus and fails if any structural divergence
remains after masking.

## 8. Phase I fixture corpus

Curate 10–20 small fixtures in `packages/html/test/fixtures/phase-1/`:

- `plain-text.html` — text-only body.
- `nested-elements.html` — `<div><span><em>x</em></span></div>`.
- `attrs-double.html`, `attrs-single.html`, `attrs-unquoted.html`,
  `attrs-bool.html`, `attrs-mixed.html`.
- `void-elements.html` — `<br>`, `<hr>`, `<img>`, `<meta>`, `<input>`.
- `void-self-closing.html` — `<br />`, `<img src="x" />`.
- `comments.html`, `comments-multiline.html`.
- `doctype-short.html`, `doctype-legacy.html`.
- `mixed-children.html` — text + element + comment + text.
- `react-ssr.html` — small snapshot of typical React server output.
- `blog-post.html` — small real-world article.

`huge-page.html` stays in `packages/html/test/fixtures/` but is excluded
from the Phase I corpus run. A documented Phase II regression target.

## 9. Acceptance criteria for Phase I

1. All current tests in `packages/html/test/html.test.ts` still pass.
2. New `conformance.test.ts` passes on every fixture in `phase-1/`.
3. `npm run audit:parser-contract` passes for `@parser2/html`.
4. `npm run gate -w @parser2/html` passes with relocked baselines (perf +
   size) reflecting the larger schema.
5. `huge-page.html` parse failure is reproducible and documented as a
   Phase II regression target.

## 10. Parking lot (Phases II–V, out of this stream)

Each item below is a separate work stream. Listed with the generic-primitive
shape that would unlock it, so future DSL design work can build on the
admission policy.

1. **Raw-text content primitive** (Phase II).
   Need: `<script>`, `<style>`, `<textarea>`, `<title>` bodies must consume
   until the *literal* close tag (`</script>`), ignoring all intervening
   characters that look like tags.
   Candidate generic primitive: extend `.until()` to accept a multi-char
   source-level literal — `.until('</script>', { source: true,
   caseInsensitive: true })`. Generic across: shell heredocs, markdown fenced
   code blocks, XML CDATA, YAML literal blocks, JS template literal middles,
   JSX raw text, ERB/PHP template delimiters.

2. **Arbitrary unquoted attribute values** (Phase II).
   Need: `<a href=/foo/bar>`, `<input value={x}>`, etc.
   Candidate generic primitive: a source-mode `.until()` variant that scans
   raw characters until any of a delimiter set — `.until([' ', '\t', '\n',
   '>', '/'], { source: true })`. Generic across: shell unquoted args, INI
   values, env-style KEY=VALUE files.

3. **Implicit-close insertion modes** (Phase III).
   Need: `<li>x<li>y` closes the first `<li>` before opening the second.
   Candidate generic primitive: either richer `.recovers()` semantics ("close
   current production and re-enter parent on trigger token"), or
   `.implicitlyClosedBy([...])` modifier on `Element`. Generic across:
   Coffeescript significant-newline, Python indentation, YAML
   block-sequence-implicit-close.

4. **Foster-parenting & insertion modes** (Phase IV).
   Need: text inside `<table>` is foster-parented before the table; head/body
   are auto-injected; foreign content switches namespace.
   Candidate generic primitive: small declarative state-machine in schema —
   `insertionModes: { ... }` declaration the compiler compiles to a
   dispatch table. Generic across: XSLT match modes, sed addresses, awk
   pattern/action programs.

5. **Foreign content (SVG / MathML)** (Phase IV).
   Need: namespaced elements; different self-close rules.
   Candidate generic primitive: `namespaces:` declaration on the schema
   + `.inNamespace(name)` modifier on productions.

6. **`parentNode` cycles** (Phase IV or later).
   Need: parse5 sets `parentNode` to a real reference. Phase I emits `null`.
   Candidate generic primitive: a compile-time post-link pass that wires
   parent pointers on tree-shaped structures. Triggered by a schema
   declaration such as `linkParents: true`. Generic across: any tree
   structure consumer that expects parent refs.

7. **Case-normalization refinement** (Phase II).
   Need: tag and attribute names should be normalized to lowercase to match
   parse5 (`<DIV>` → `'div'`). Today's structure literal cannot transform a
   `$.tag` capture.
   Candidate generic primitive: `.ident().caseInsensitive()` or
   `.lowercased()` refinement on the `ident` class. Generic across: SQL
   keywords, HTTP methods, MIME types.

8. **parse5 `sourceCodeLocation` exact shape** (Phase II or III).
   Need: parse5's flat `{startLine, startCol, startOffset, endLine, endCol,
   endOffset, startTag, endTag, attrs}` shape vs our auto-attached
   `source: {start, end}`.
   Candidate generic primitive: schema directive to rename / reshape the
   auto-attached source field, e.g. `source: { fieldName:
   'sourceCodeLocation', shape: 'flat' }`. Generic — useful any time a
   schema mirrors a third-party AST shape.

## 11. Open questions deferred to Phase I implementation

None blocking. The implementation plan (writing-plans skill output) will
break the work into TDD-friendly steps and surface any DSL ergonomics that
need follow-up.
