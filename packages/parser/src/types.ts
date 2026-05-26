// All DSL types. These are pure data shapes consumed by the compiler.

export type WhitespacePolicy = 'standard' | 'significant';

// How the generated tokenizer reacts to a byte it can't classify under any
// declared literal, class scanner, or punctuator.
//   'reject'   — throw SyntaxError (default; what every prior schema relied on)
//   'tolerate' — emit a single-char `raw` token at that offset and continue;
//                lets `.until()` captures cover arbitrary content without the
//                schema enumerating every possible character. Generic across
//                tag-soup HTML, shell heredocs, JSX raw text, INI values.
export type UnknownCharPolicy = 'reject' | 'tolerate';

export type TrailingPolicy = 'allowed' | 'required' | 'forbidden';

// --- Spans -----------------------------------------------------------------

export type SpanClass =
  | 'literal'
  | 'ident'
  | 'number'
  | 'string'
  | 'hex'
  | 'regex'
  | 'template'
  | 'comment'
  | 'whitespace'
  | 'keyword'
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
  | { readonly kind: 'requireSpaceAfter' };

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

export type RenderBody =
  | string
  | number
  | boolean
  | null
  | StructureRef
  | Template
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

export type OperatorLayers = {
  readonly [layerName: string]: ReadonlyArray<string>;
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

export type ValidationRuleDef = {
  readonly nodeType: string;
  readonly field: string;
  readonly matchField: string;
  readonly matchValues: ReadonlyArray<string>;
  readonly validator: ValidatorImport;
};

export type ValidationDef = {
  readonly schema: SchemaDef;
  readonly rules: ReadonlyArray<ValidationRuleDef>;
};
