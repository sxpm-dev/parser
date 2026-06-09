// All DSL types. These are pure data shapes consumed by the compiler.

// 'standard'    — any whitespace (including newlines) is ignored between
//                  spans. Inter-span gaps are collapsed to a single space
//                  when reconstructing source. This is the default and what
//                  every shipped parser uses today.
// 'significant'  — declared since day one as a placeholder for languages
//                  where whitespace is structurally meaningful (Python,
//                  YAML); behavior matches 'standard' in v2 codegen today
//                  because no in-scope schema declares it. The `.indent()`
//                  span modifier is the supported way to express indent
//                  significance per-production.
// 'preserve'     — every inter-span whitespace slice is captured as
//                  `captures.__ws[i]` and re-emitted byte-exactly by
//                  stringify. Enables formatter / codemod use cases that
//                  need round-trip fidelity. See
//                  docs/superpowers/plans/2026-06-06-9-10-roadmap.md
//                  Phase 4b.
export type WhitespacePolicy = 'standard' | 'significant' | 'preserve';

// How the generated tokenizer reacts to a byte it can't classify under any
// declared literal, class scanner, or punctuator.
//   'reject'   — throw SyntaxError (default; what every prior schema relied on)
//   'tolerate' — emit a single-char `raw` token at that offset and continue;
//                lets `.until()` captures cover arbitrary content without the
//                schema enumerating every possible character. Generic across
//                tag-soup HTML, shell heredocs, JSX raw text, INI values.
export type UnknownCharPolicy = 'reject' | 'tolerate';

// Phase 8 dials — applied at parse entry as a single composable preamble.
// Transparent to existing schemas at their default values; the v2 emitter
// emits per-dial preamble code only for dials a schema changes from default
// (with `bom: 'allow'` as the one exception that emits a no-op BOM-strip
// check even at default — see emit/v2/index.ts emitPreamble for the
// rationale on interp/emit consistency).

// BOM (U+FEFF) handling at parse entry.
//   'allow'   — strip a leading BOM if present (default).
//   'reject'  — throw a parse error if a BOM is present.
//   'require' — throw a parse error if a BOM is absent.
export type BomPolicy = 'allow' | 'reject' | 'require';

// Unicode normalization applied to the entire input before scan.
//   'none' — no normalization (default).
//   'NFC'  — call input.normalize('NFC') once at entry.
//   'NFD'  — call input.normalize('NFD') once at entry.
export type UnicodeForm = 'none' | 'NFC' | 'NFD';

// Newline canonicalization applied to the entire input before scan.
//   'LF'              — no transform (default). Lone \r will fail literal
//                       matches at scan time; the schema author owns that.
//   'CRLF'            — normalize \r\n → \n once at entry.
//   'either-preserve' — normalize \r\n → \n and lone \r → \n once at entry.
//                       Round-trip is value-stable but not byte-stable for
//                       CRLF input (it becomes LF on the first stringify).
export type NewlinePolicy = 'LF' | 'CRLF' | 'either-preserve';

export type TrailingPolicy = 'allowed' | 'required' | 'forbidden';

// --- Spans -----------------------------------------------------------------

export type SpanClass =
  | 'literal'
  | 'ident'
  | 'number'
  | 'string'
  | 'hex'
  | 'comment'
  | 'operator';

export type Refinement = {
  readonly name: string;
  readonly args?: ReadonlyArray<unknown>;
};

export type SpanModifier =
  | { readonly kind: 'optional' }
  | {
      readonly kind: 'repeats';
      readonly sep?: string;
      readonly trailing?: TrailingPolicy;
      readonly min?: number;
      readonly max?: number;
      // Exit the repetition loop without consuming when upcoming source
      // (at the current token's start offset) begins with any of these
      // literal prefixes. Models implicit-close idioms — HTML `<li>`
      // closing on next `<li>`, Coffeescript newline-significant blocks,
      // YAML block sequences ending on dedent-like patterns.
      readonly stopBefore?: ReadonlyArray<string>;
    }
  | {
      readonly kind: 'rawUntil';
      // Stop when the source contains any of these literal strings at or
      // after the current position. Capture is the raw source slice. The
      // capture does NOT advance past the stop — the next span consumes it.
      // Use for raw-text element bodies (`<script>`, `<style>`) and for
      // unquoted attribute values that may contain non-token characters.
      readonly stops: ReadonlyArray<string>;
      readonly caseInsensitive: boolean;
      // When true, the production fails if the scan reaches end of input
      // without matching any stop. Default false: EOF is treated as a
      // successful stop.
      readonly requireStop?: boolean;
      // When true, the production fails when the captured value is empty
      // (zero-length). Used for productions where the value must be non-trivial.
      readonly nonEmpty?: boolean;
    }
  | {
      readonly kind: 'until';
      // Stop when the current token's value matches one of these literals.
      readonly stops: ReadonlyArray<string>;
      // When true (default), bracket pairs nest and stops outside of any
      // bracket pair end the capture. When false, stops apply regardless of
      // nesting (rare; used for unbalanced productions).
      readonly balanced: boolean;
      // When true (default), strip leading/trailing whitespace from the
      // captured source slice.
      readonly trim: boolean;
      // If set, the production fails when the captured value (after
      // trimming) ends with ANY of these strings. Used to discriminate
      // ambiguous productions — e.g. a Rule's selector should not end
      // with `:` (custom-property Declaration), `,` / `>` / `+` / `~`
      // (trailing CSS combinator).
      readonly rejectSuffix?: ReadonlyArray<string>;
      // If true, the production fails when the captured value (after
      // trimming) is empty (zero-length). Used for required captures.
      readonly nonEmpty?: boolean;
      // When true, the production fails if the scan reaches end of input
      // without matching any stop. Default false: EOF is treated as a
      // successful stop (the common case for declaration-style scans where
      // the terminator may be absent on the last item).
      readonly requireStop?: boolean;
    }
  | { readonly kind: 'noLineTerminatorAfter' }
  | { readonly kind: 'noWhitespaceAfter' }
  | { readonly kind: 'requireSpaceAfter' }
  | {
      // Column-significant indent scope. Used on a recursive-repeats span to
      // mark the block as indented relative to the surrounding production.
      //
      // Semantics (MVP — see docs/superpowers/plans/2026-05-28-phase-7-indentation.md
      // for the full design):
      //   - On entry to the indented repeats loop, the column where the FIRST
      //     child begins is captured and pushed onto state.indentStack.
      //   - Each subsequent iteration must begin at that same column (after
      //     consuming any number of blank or whitespace-only lines).
      //   - The loop exits cleanly when the next non-blank line starts at a
      //     strictly smaller column (dedent).
      //   - Only ASCII space (0x20) counts toward the indent column; tabs are
      //     not supported.
      //   - Maximum stack depth is 16 (`Int32Array(16)`); deeper nesting is a
      //     syntax error.
      readonly kind: 'indent';
    };

export type SpanDef = {
  readonly name?: string;
  readonly text?: string;
  // Roles this span can recursively match. Empty = non-recursive (literal or
  // classed). Single = bind to one node type. Multiple = try each role in
  // order at parse time (e.g. ['Rule', 'AtRule'] for stylesheet children).
  readonly recursiveRoles: ReadonlyArray<string>;
  readonly class: SpanClass;
  readonly refinements: ReadonlyArray<Refinement>;
  readonly modifiers: ReadonlyArray<SpanModifier>;
};

// --- Structure refs --------------------------------------------------------
//
// Structure refs are the $ref markers produced by the `$` proxy. They appear
// in render bodies (and inside `tpl` templates as slots). The compiler walks
// the body, encounters these markers, and rewrites them into capture reads
// in emitted code.

export type SpanValueRef = {
  readonly __ref: 'span-value';
  readonly name: string;
};

export type SpanPresenceRef = {
  readonly __ref: 'span-presence';
  readonly name: string;
};

// Source slice between two named spans. Compiles to
// `input.slice(<from>_end, <to>_start)` — i.e. everything that came between
// where `from` finished and where `to` started, including any whitespace,
// comments, or literal punctuators consumed by intervening spans.
//
// Primary use: declaring raws fields where PostCSS stores the formatting
// chars that sit between two captured regions (e.g. Decl `raws.between`
// covers the `:` plus surrounding whitespace between prop and value).
export type SpanGapRef = {
  readonly __ref: 'span-gap';
  readonly from: string;
  readonly to: string;
};

// Source slice from a named span's end to the end of the current
// production's source range (i.e. the last consumed token's end —
// the same offset that becomes source.end on the resulting node).
// Compiles to `input.slice(<name>_end, __endOff)`.
//
// Used for root-container raws.after (whitespace after the last child up
// to where the root's source ends, which naturally excludes trailing
// whitespace beyond the last meaningful token — matching PostCSS).
export type SpanTailRef = {
  readonly __ref: 'span-tail';
  readonly from: string;
};

// Raw source slice of a named span (start to end, unmodified — no folding,
// no trimming). Compiles to `input.slice(<name>_start, <name>_end)`. Used
// for PostCSS-style raws.value, raws.selector when the captured value was
// folded or trimmed and we want the original source preserved.
export type SpanRawRef = {
  readonly __ref: 'span-raw';
  readonly name: string;
};

// Boolean — whether the named span's source ends with the given suffix.
// Compiles to `state.input.slice(<name>_end - len, <name>_end) === str`.
// Used for raws.semicolon (checks whether the body's last child ended in
// the separator character).
export type SpanEndsWithRef = {
  readonly __ref: 'span-ends-with';
  readonly name: string;
  readonly suffix: string;
};

// Leading whitespace inside a comment span's interior — i.e. the chars
// between `/*` (or analogous open marker) and the first non-whitespace.
// Used for PostCSS Comment raws.left.
export type SpanCommentLeftRef = {
  readonly __ref: 'span-comment-left';
  readonly name: string;
};

// Trailing whitespace inside a comment span's interior — chars between
// the last non-whitespace and `*/`. Used for PostCSS Comment raws.right.
export type SpanCommentRightRef = {
  readonly __ref: 'span-comment-right';
  readonly name: string;
};

export type StructureRef =
  | SpanValueRef
  | SpanPresenceRef
  | SpanGapRef
  | SpanTailRef
  | SpanRawRef
  | SpanEndsWithRef
  | SpanCommentLeftRef
  | SpanCommentRightRef;

// --- Templates -------------------------------------------------------------
//
// Authored via the `tpl` tagged-template helper. Plain data: a list of static
// `parts` interleaved with `slots` that reference span captures by name. The
// compiler walks this at codegen time and bakes straight-line concat into the
// generated parser — there is no template interpreter at runtime.

export type TemplateSlot = {
  readonly kind: 'capture';
  readonly ref: string;
};

export type Template = {
  readonly __tpl: true;
  readonly parts: ReadonlyArray<string>;
  readonly slots: ReadonlyArray<TemplateSlot>;
};

// --- Render bodies ---------------------------------------------------------
//
// A render body is the declared output shape for one (production, target)
// pair. The compiler walks it structurally: Template → string concat,
// object → object allocation, array → array allocation, scalar → literal,
// StructureRef → capture read.

/**
 * Dynamic-key body: at render time produces `{ [captures[key.name]]: <value> }`.
 * Used by flat-object target shapes where the JSON key is a captured value
 * rather than a fixed schema literal (e.g. CSS `{ '.foo': { 'color': 'red' } }`).
 * Inverse direction reads the single-entry object's key into captures and
 * recurses on the value.
 */
export interface DynKeyBody {
  readonly __dynKey: true;
  readonly key: StructureRef;
  readonly value: RenderBody;
}

/**
 * Merge body: at render time produces `Object.assign({}, ...captures[array].filter(o => o && typeof o === 'object'))`.
 * Filters non-object children (e.g. those whose own body returned null).
 * Inverse direction iterates the object's entries and dispatches each through
 * the recursive role's per-production inverse — value-type discrimination
 * (string → declaration-shape, object → rule-shape) picks the matching
 * production.
 */
export interface MergeBody {
  readonly __merge: true;
  readonly array: StructureRef;
}

export type RenderBody =
  | string
  | number
  | boolean
  | null
  | StructureRef
  | Template
  | DynKeyBody
  | MergeBody
  | ReadonlyArray<RenderBody>
  | { readonly [key: string]: RenderBody };

export type RenderTargetDef = {
  readonly target: string;
  readonly body: RenderBody;
  readonly inverse?: Template;
};

// --- Examples --------------------------------------------------------------

export type RecoveryPolicy = {
  readonly syncAt: ReadonlyArray<string>;
  readonly drop: string;
};

// Emitted by the generated parser whenever a `.recovers({ drop, syncAt })`
// production matched. `code` distinguishes the diagnostic shape (today only
// 'recovered' is emitted; future codes can mark distinct recovery flavors).
// `drop` carries the schema-declared label so callers can render
// language-specific messages from a stable identifier. `start` / `end` are
// byte offsets into the parsed input demarcating the dropped region.
export type Diagnostic = {
  readonly code: string;
  readonly drop: string;
  readonly start: number;
  readonly end: number;
};

export type ExampleStatus =
  | { readonly kind: 'valid' }
  | { readonly kind: 'recovered'; readonly recovery: RecoveryPolicy }
  | { readonly kind: 'rejected' };

export type ExampleDef = {
  readonly input: string;
  readonly nodeType?: string;
  readonly spans: ReadonlyArray<SpanDef>;
  readonly status: ExampleStatus;
  readonly renders: ReadonlyArray<RenderTargetDef>;
};

// --- Operators / Punctuators / Schema -------------------------------------

// Per-layer operator declaration. The bare-array form (legacy) declares
// left-associative operators at this precedence layer. The object form
// allows opt-in to right-associativity (`exponential: { ops: ['**'],
// assoc: 'right' }`). Default associativity is 'left'.
//
// Schemas authored before the object form was added continue to work
// byte-identically — the inferrer treats `['||','&&']` as `{ops:
// ['||','&&'], assoc: 'left'}`.
export type OperatorLayer =
  | ReadonlyArray<string>
  | {
      readonly ops: ReadonlyArray<string>;
      readonly assoc?: 'left' | 'right';
    };

export type OperatorLayers = {
  readonly [layerName: string]: OperatorLayer;
};

// A punctuator declaration assigns one or more literal texts to a token type
// name. E.g. { lbrace: '{', delim: ['.', '+', '>'] } produces tokens whose
// type is 'lbrace' or 'delim' as appropriate, with value being the matched
// literal. The array form (or a bare literal in a span) implies type = value.
export type PunctuatorMap = {
  readonly [typeName: string]: string | ReadonlyArray<string>;
};

export type PunctuatorDecl = {
  readonly literal: string;
  readonly type: string;
};

export type TokenDecl = {
  readonly class: SpanClass;
  readonly refinements?: ReadonlyArray<Refinement>;
};

export type SchemaDef = {
  readonly rootType: string;
  readonly uses: ReadonlyArray<SchemaDef>;
  readonly operators: OperatorLayers;
  readonly punctuators: ReadonlyArray<PunctuatorDecl>;
  // Extra token classes the tokenizer should recognize beyond what spans
  // explicitly use. Needed when .until() captures sweep over tokens that
  // no span describes directly (e.g. numbers and strings inside selectors
  // and declaration values).
  readonly tokens: ReadonlyArray<TokenDecl>;
  readonly whitespace: WhitespacePolicy;
  readonly unknownChars: UnknownCharPolicy;
  readonly bom: BomPolicy;
  readonly unicode: UnicodeForm;
  readonly newlines: NewlinePolicy;
  // When false, input is lowercased via input.toLowerCase() at parse entry,
  // AFTER bom/unicode/newlines. Captures see the lowercased view. Schemas
  // with caseSensitive:false must write examples in canonical (lowercase)
  // form for the round-trip theorem.
  readonly caseSensitive: boolean;
  readonly defaultTarget?: string;
  readonly examples: ReadonlyArray<ExampleDef>;
};

// SchemaInput: what authors write. Intentionally has no `name` field — the
// compiler MUST NOT branch on schema/package names. Identity in the
// composition graph (`uses:`) is by object reference. Output-file paths
// and generated module identity come from the compiler invocation (CLI
// derives a package name from the schema file path).
export type SchemaInput = {
  readonly rootType: string;
  readonly uses?: ReadonlyArray<SchemaDef>;
  readonly operators?: OperatorLayers;
  readonly punctuators?: ReadonlyArray<string> | PunctuatorMap;
  readonly tokens?: ReadonlyArray<SpanClass | TokenDecl>;
  readonly whitespace?: WhitespacePolicy;
  readonly unknownChars?: UnknownCharPolicy;
  readonly bom?: BomPolicy;
  readonly unicode?: UnicodeForm;
  readonly newlines?: NewlinePolicy;
  readonly caseSensitive?: boolean;
  readonly defaultTarget?: string;
  readonly examples: ReadonlyArray<ExampleDef>;
};

// --- Package-level validation composition ---------------------------------
//
// This is deliberately not part of SchemaDef. It describes package-level
// composition between one generated parser and other generated parser modules.

export type GeneratedValidator = ((input: string) => void) & {
  readonly __parser2Validator?: ValidatorImport;
};

export type ValidatorImport = {
  readonly module: string;
  readonly exportName: string;
};

// Either an external module import (legacy) or an inline sub-schema (new in
// the Phase 10 css validator composition work). The 'import' variant reuses
// ValidatorImport so the two definitions stay in lockstep.
export type ValidatorRef =
  | (ValidatorImport & { readonly kind: 'import' })
  | { readonly kind: 'inline'; readonly schema: SchemaDef };

export type ValidationRuleDef = {
  readonly nodeType: string;
  readonly field: string;
  readonly matchField: string;
  readonly matchValues: ReadonlyArray<string>;
  readonly validator: ValidatorRef;
};

export type ValidationDef = {
  readonly schema: SchemaDef;
  readonly rules: ReadonlyArray<ValidationRuleDef>;
};
