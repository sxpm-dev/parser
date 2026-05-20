// All DSL types. These are pure data shapes consumed by the compiler.

export type WhitespacePolicy = 'standard' | 'significant';

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
      // trimming) ends with this string. Used to discriminate ambiguous
      // productions — e.g. a Rule's selector should not end with `:`
      // (which signals a custom-property Declaration like `--foo: ...`).
      readonly rejectSuffix?: string;
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

// --- Structure literal -----------------------------------------------------
//
// Structure literals are plain JSON-ish data with $ref markers in the leaves.
// At build time the $ proxy produces these markers; the compiler walks the
// structure and rewrites them into emitted code.

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

export type StructureValue =
  | string
  | number
  | boolean
  | null
  | StructureRef
  | ReadonlyArray<StructureValue>
  | { readonly [key: string]: StructureValue };

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
  readonly structure?: StructureValue;
  readonly status: ExampleStatus;
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
  readonly name: string;
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
  readonly examples: ReadonlyArray<ExampleDef>;
};

export type SchemaInput = {
  readonly name: string;
  readonly rootType: string;
  readonly uses?: ReadonlyArray<SchemaDef>;
  readonly operators?: OperatorLayers;
  readonly punctuators?: ReadonlyArray<string> | PunctuatorMap;
  readonly tokens?: ReadonlyArray<SpanClass | TokenDecl>;
  readonly whitespace?: WhitespacePolicy;
  readonly examples: ReadonlyArray<ExampleDef>;
};
