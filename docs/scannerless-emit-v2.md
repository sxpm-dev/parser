# Scannerless emit v2 — design

> Replaces `packages/compiler/src/emit/scannerless/` and retires
> `packages/compiler/src/emit/direct-fast.ts`. This is the contract the
> redesigned compiler emits against. See bottom for the cron worked example.

## Why redo it

The current scannerless emit is a port of the tokenized emit. It treats each
span as an independently-emitted, function-callable unit that talks through a
shared `state` struct. That made sense when the input was a token array.
On byte input it is ~65× slower than `direct-fast.ts`, the hand-written
byte parser for the same schema. The cost is structural:

- function-per-production + helper-per-span — call overhead between siblings
- speculative dispatch via `throw new SyntaxError(...)` caught by `try`
  (used as `goto`); each throw stack-captures (~1.6µs in V8)
- per-call `__comments: [number, number][]` allocation in until-scans
- `state` struct with scattered hot fields, written between every span
- trim-trailing-ws as a post-pass after each capture

`direct-fast` proves bytes→AST can be fast. It's fast because of design
choices that are schema-agnostic (peek-dispatch, inlined bodies, one shared
scan kernel, locals-not-state during scans). v2 generates code in that style
from the schema, so the special-case bypass goes away.

**Non-goals of v2**: changing the user-facing schema DSL. v2 only changes
how the compiler lowers a schema to JS.

## Mental model

Source bytes go straight into AST nodes via a recursive-descent parser whose
generated code is one straight-line function per production. There is no
tokenizer, no token-array, no token-class IDs anywhere — even conceptually.

A schema lowers to a parser that uses only these primitives:

| Primitive | What it does |
|---|---|
| `peek(literal)` | does `input` start with these bytes at `off`? (cheap, no consume) |
| `consume(literal)` | match-or-fail; advance `off` by `literal.length` |
| `scan(class)` | tight byte loop that matches an ident / number / hex / string class; advances `off` past it |
| `scan-until(stop-set)` | tight byte loop respecting strings/brackets/escapes/url/comments; stops at first un-nested char from `stop-set`; advances `off` to that char |
| `skip-ws` | inline 4-byte check loop (` \t\n\r`); emitted at boundary points only |

That's the entire IR. Every span in the schema lowers to one or two of these.
There is no "span function". There is no `state.off` write between adjacent
primitives within a production body — `off` is a local.

## Failure protocol — no exceptions

**Speculative failure is `null` return (or `-1` for offsets). It is never an
exception.** Each compiler-emitted parse function:

- Returns the parsed node on success.
- Returns `null` on failure, after rewinding `state.off` to its entry value.

Callers check the return; on `null`, they either try the next alt or
propagate `null` upward. **Top-level `parse()` is the only place that
constructs a `SyntaxError`** — using the deepest `off` seen during the parse.
We track that depth via `state.maxOff` (updated on every advance), so the
position in the error message corresponds to where parsing actually got
stuck, not where speculation rewound to.

The runtime helpers shrink to roughly:

```ts
function speculate(state, fn) {
  const start = state.off;
  const r = fn(state);
  if (r === null) state.off = start;
  return r;
}
```

No `try`/`catch`. No `throw`. The runtime carries no error machinery
beyond the final wrapper in `parse()`.

## Dispatch ladder

When a node has multiple productions, the compiler picks the cheapest
dispatcher that proves correct, never falling back to speculation if it
can avoid it.

1. **Byte-prefix dispatch.** All alts have distinct first-byte sets (literal
   prefixes, class start-predicates). Emit one switch on `charCodeAt(off)`.
   Zero peek-scan. Example: CSS body `[Comment(/*), AtRule(@), …]`.

2. **Discriminator peek-scan.** Alts share a prefix and differ by a literal
   that appears within a known bounded scan ahead. Emit one `scan-until`
   over the union of all alts' stop-sets; branch on which stop fires.
   Example: CSS `Rule` ends at `{`; `Declaration` ends at `:`; one scan
   tells us which alt to commit. Same idea distinguishes `*` from `*/N` in
   cron — peek the byte after `*`.

3. **Sentinel speculation.** Only when (1) and (2) are both impossible.
   Try each alt with `speculate(...)`; the parse functions return `null`
   on failure. Still no throws.

The compiler picks per-call-site; different multi-prod nodes can use
different strategies. The cron worked example uses (1)+(2) and emits zero
speculation calls.

### Discriminator peek-scan in detail

Given alts A and B that share the first span (e.g. an until-capture of a
selector / prop / value) and then diverge on a literal:

- Compute the *union stop-set* across A's and B's first divergent literals.
- Emit a single `scan-until(unionStopSet)` at the call site. It walks
  forward respecting strings/brackets/escapes (the same kernel any
  until-capture uses).
- Branch on `input.charCodeAt(stopOff)` to commit to A or B. The capture
  range already collected by the scan is **threaded into the committed alt
  as a pre-captured value** (the alt's body starts at the post-prefix
  position; it doesn't re-scan).

This avoids the current double-scan that happens when speculation rewinds
and re-tries.

## Production body shape

Each production becomes one straight-line function. Adjacent spans inline.
No `parseSpan` calls. Locals replace state writes inside the body.

```ts
function parseFoo(state) {
  const input = state.input;
  const len = input.length;
  let off = state.off;
  const entryOff = off;

  // skip-ws (inline)
  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    break;
  }

  // ... primitives inline, each may set off backwards + return null on fail
  //     OR (for nested productions) call another parseX(state)

  state.off = off;
  return { type: 'foo', /* fields */ };
}
```

State is `{ input, off, maxOff }` — three fields. `off` is read at entry,
written at exit; in between, the function uses the local `off`. Nested
parser calls write/read `state.off` at the boundary (because the callee
operates on `state`).

## Struct construction

The result of a production is one object literal at the end of the body.
All fields are known at codegen time. Raws-mode adds extra fields to the
**same literal** — never a post-construction `.source = …` mutation. The
hidden class is stable across calls.

```ts
// fast mode
return { type: 'rule', selector, nodes };

// raws mode (same literal, two extra fields)
return {
  type: 'rule',
  selector,
  nodes,
  source: { start: posAt(startOff), end: posAt(endOff) },
  raws: {
    before: input.slice(prevSibEnd, startOff),
    between: input.slice(selEnd, lbraceOff),
    after: input.slice(lastChildEnd, rbraceOff),
  },
};
```

Repeats children's `raws.before` is computed by the **parent body** before
appending to the children array — passed into the child constructor as an
arg, baked into the literal, no mutation.

## Scan kernel

`scan-until(stop-set)` is one shared kernel per distinct stop-set in the
schema. It's emitted as a top-level helper, **inlined at call sites** when
the schema uses a stop-set in ≤ 2 places (which is the common case). The
kernel:

```ts
function scanUntil_XXX(input, off, len) {  // XXX = hash of stop-set
  let depth = 0;
  let lastNonWs = off;
  while (off < len) {
    const c = input.charCodeAt(off);
    if (depth === 0 && /* c is in stop set */) break;
    // open-brackets/strings/escapes/url/comments handled inline …
    if (!(c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d)) lastNonWs = off + 1;
    off++;
  }
  return { stopOff: off, lastNonWs };
}
```

Trim-trailing-ws is fused into the loop (`lastNonWs`), not a post-pass.
Comment tracking is only emitted into the kernel when the schema declares
`tokens: ['comment']`, and even then `__comments` is lazy-allocated on the
first comment found (not pre-allocated to `[]`).

## raws-mode delta

In one place — at struct construction. Codegen flag `variant: 'fast' | 'raws'`
gates the extra fields. The scan kernel is the **same** in both modes (the
kernel already computes `lastNonWs` and stop offset; raws uses them, fast
discards). No second pass, no second function, no `__lastCaptureStart/End`
state writes.

The "raws is structurally ~10% slower than fast" property falls out:
raws emits a few more `input.slice(...)` calls and one `posAt(...)` per
node, baked into the same object literal. That's it.

## Runtime size

After v2, the per-parser runtime is roughly:

- `posAt(state, off)` — line/column lookup for raws (cached lineStarts)
- `speculate(state, fn)` — null-rewind helper (used only when ladder rung 3 fires)
- (none of: `tryRoles`, `tryRolesOrNull`, `decorateSyntaxError`'s offset-from-message,
  `attachRawsBefore`, the captureStart/captureEnd state machinery)

direct-fast's 1137 lines of hand-tuned helpers go away.

---

## Worked example — cron

Cron schema has 4 node types and is the smallest scannerless schema in the
tree. Productions:

- `Cron` = 6 fields (5× CronField + 1 optional Command), space-separated
- `CronField` = 4 alts: `*` | `*/N` | `N` | `N-N`
- `Command` = `CommandWord (CommandWord)*`
- `CommandWord` = ident

### Dispatch for CronField (4 alts)

Byte-prefix dispatch handles all four:

```js
function parseCronField(state) {
  // skip-ws (inline) ...
  const c = input.charCodeAt(off);
  if (c === 0x2a /* * */) {
    // Discriminate * from */N by peeking next byte
    if (off + 1 < len && input.charCodeAt(off + 1) === 0x2f) {
      // */N
      off += 2;
      const numStart = off;
      while (off < len && isDigit(input.charCodeAt(off))) off++;
      if (off === numStart) { state.off = entryOff; return null; }
      const step = input.slice(numStart, off);
      state.off = off;
      return { type: 'step', step };
    }
    off++;
    state.off = off;
    return { type: 'wildcard' };
  }
  if (isDigit(c)) {
    const aStart = off;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const a = input.slice(aStart, off);
    if (off < len && input.charCodeAt(off) === 0x2d /* - */) {
      off++;
      const bStart = off;
      while (off < len && isDigit(input.charCodeAt(off))) off++;
      if (off === bStart) { state.off = entryOff; return null; }
      const b = input.slice(bStart, off);
      state.off = off;
      return { type: 'range', start: a, end: b };
    }
    state.off = off;
    return { type: 'value', value: a };
  }
  return null;
}
```

Zero speculation, zero throws, one function per node type, body is straight-
line. This is what the v2 compiler emits from the cron schema.

### Cron's body

`parseCron` reads six fields in sequence, then optional command:

```js
function parseCron(state) {
  // No skip-ws at root entry; field skip-ws lives between fields.
  const minute     = parseCronField(state); if (minute === null) return null;
  skipWs(state); const hour       = parseCronField(state); if (hour === null) return null;
  skipWs(state); const dayOfMonth = parseCronField(state); if (dayOfMonth === null) return null;
  skipWs(state); const month      = parseCronField(state); if (month === null) return null;
  skipWs(state); const dayOfWeek  = parseCronField(state); if (dayOfWeek === null) return null;

  // Optional command
  const beforeCmd = state.off;
  skipWs(state);
  let command = null;
  if (state.off < state.input.length) {
    command = parseCommand(state);
    if (command === null) state.off = beforeCmd;
  }
  return { type: 'cron', minute, hour, dayOfMonth, month, dayOfWeek, command };
}
```

`parseCommand` and `parseCommandWord` lower similarly.

This is the target shape. Step 2 is to implement it by hand and validate
against cron's existing tests; step 3 is to make the compiler emit this from
the schema.

## Migration plan

1. Doc (this file) — locks the contract.
2. Hand-author `cron`'s emit, validate tests/bench. Establishes the target.
3. Implement v2 compiler against `cron` schema; output matches hand-authored.
4. Roll to `css` (perf canary). Target: raws ≤ 10% off fast, both within ~2× direct-fast.
5. If (4) holds: delete `direct-fast.ts` and `emit/scannerless/parse.ts`. v2 becomes the sole backend.
6. Roll to remaining migrated schemas one at a time.

Old emit stays alive until each schema is moved. No big-bang.
