// The InferredSchema is the intermediate representation produced by the
// inference passes and consumed by the emitter. It contains only generic
// shape — no language-specific knowledge.

import type {
  BomPolicy,
  ExampleDef,
  NewlinePolicy,
  RecoveryPolicy,
  Refinement,
  RenderBody,
  SpanClass,
  SpanDef,
  SpanModifier,
  UnicodeForm,
  UnknownCharPolicy,
  ValidationDef,
  WhitespacePolicy,
} from '@parser2/parser';

export type ResolvedSpan = {
  readonly name?: string;
  readonly text?: string;
  readonly class: SpanClass;
  readonly refinements: ReadonlyArray<Refinement>;
  readonly modifiers: ReadonlyArray<SpanModifier>;
  readonly recursiveRoles: ReadonlyArray<string>; // resolved against the composition graph
};

// Per-(production, target) IR entry built by infer/render-targets.ts.
// `body` is whatever the schema author handed to .render(target, body) —
// either a Template (tpl-tagged literal) or a structured object/array/scalar
// tree with $ref leaves. `inverse` is the optional author-supplied template
// override used to drive the reverse direction (target text → captures).
// `inverseDerived` is the compile-time derivation produced by Phase 4
// (`infer/invert.ts`); the inverse emitter walks it to recover captures
// from a target value before handing them to the shared rebuild subroutine.
export type RenderTargetIR = {
  readonly target: string;
  readonly body: RenderBody;
  readonly inverse?: import('@parser2/parser').Template;
  readonly inverseDerived?: InverseIR;
};

// IR describing how to recover the original capture map from a rendered value
// for one (production, target) pair. Discriminator mirrors the body shape it
// was derived from: object bodies invert into per-field reads, arrays into
// positional reads, scalars into equality assertions, $.name refs into a
// single capture write, and Template bodies into a literal-segment scanner.
export type InverseIR =
  | { readonly kind: 'object'; readonly fields: ReadonlyArray<InverseField> }
  | { readonly kind: 'array'; readonly elements: ReadonlyArray<InverseIR> }
  | { readonly kind: 'scalar'; readonly value: string | number | boolean | null }
  | { readonly kind: 'ref'; readonly capture: string }
  | {
      readonly kind: 'template';
      readonly segments: ReadonlyArray<string>;
      readonly captures: ReadonlyArray<string>;
    }
  // Flat-object dynamic-key body inverse: input is a single-entry object;
  // the key string is read into captures[keyCapture]; the entry value is
  // recursed via `value`. Used to invert bodies declared with the parser's
  // `dynKey(...)` builder.
  | {
      readonly kind: 'dynKey';
      readonly keyCapture: string;
      readonly value: InverseIR;
    }
  // Flat-object merge body inverse: input is an object; each entry is
  // dispatched through the recursive role's per-production inverter, with
  // value-type discrimination naturally selecting the right production
  // (string entry value → leaf-ref-shaped production, object entry value
  // → dynKey/merge-shaped production). Used to invert bodies declared
  // with the parser's `merge(...)` builder.
  | {
      readonly kind: 'merge';
      readonly arrayCapture: string;
      readonly roles: ReadonlyArray<string>;
    };

// One named field in an object-body inverse. Literal fields assert equality
// at runtime (no captures produced). Inverse fields recurse into a nested
// InverseIR that populates captures from the field's value.
export type InverseField =
  | {
      readonly kind: 'literal';
      readonly name: string;
      readonly value: string | number | boolean | null;
    }
  | { readonly kind: 'inverse'; readonly name: string; readonly inverse: InverseIR };

export type Production = {
  readonly nodeType: string;
  readonly source: ExampleDef;
  readonly spans: ReadonlyArray<ResolvedSpan>;
  // All render targets declared on this production by attachRenderTargets,
  // keyed by target name. No auto-derived entries are added here — Phase 3
  // owns per-target codegen and decides what (if anything) to synthesize.
  readonly renders: ReadonlyMap<string, RenderTargetIR>;
  // Present on productions whose example was marked .recovers({...}). These
  // are not tried in normal dispatch — only when every valid production for
  // the node type has failed. The policy's syncAt is reserved for future
  // partial-recovery codegen; the first slice treats recovered productions
  // as plain fallback parsers.
  readonly recovery?: RecoveryPolicy;
};

export type NodeTypeInfo = {
  readonly name: string;
  readonly productions: ReadonlyArray<Production>;
};

export type TokenClassUsage = {
  readonly class: SpanClass;
  // Refinements applied across all uses of this class. For v1 we union them;
  // the emitter inlines a predicate that admits any value matching any
  // refinement.
  readonly refinements: ReadonlyArray<Refinement>;
};

export type LiteralDecl = {
  readonly literal: string;
  readonly type: string;
};

export type InferredSchema = {
  // The package name supplied externally by the compiler caller (CLI derives
  // it from the schema file path). Used ONLY for code identity — the
  // generated file header comment and the generated validator's module
  // identity metadata. Parser behavior MUST NOT branch on this value.
  readonly packageName: string;
  // Optional symbol prefix prepended to every emitted top-level function
  // name by the v2 backend. Default '' produces byte-identical output to
  // the prior code path. Non-empty values are reserved for the inline-
  // validator composition pass (Phase C), where each sub-schema gets a
  // unique prefix (e.g. `__v0_`, `__v1_`) so multiple parsers can be
  // concatenated into one source file without name collisions.
  readonly symbolPrefix: string;
  // Emission mode for the v2 backend. 'standalone' produces a self-
  // contained module file (default — byte-identical to the prior code
  // path). 'inline' suppresses the file header, runtime helpers, shared
  // type declarations, and the public exports so the result can be
  // concatenated into a parent's source by the inline-validator
  // composition pass without symbol or type collisions.
  readonly emitMode: 'standalone' | 'inline';
  readonly rootType: string;
  readonly nodeTypes: ReadonlyMap<string, NodeTypeInfo>;
  // All literal terminal texts that appear in spans, declared punctuators,
  // operator layers, and separator modifiers. Sorted by literal length
  // descending for longest-match emission. Each carries its assigned token
  // type (named if declared via punctuators: {...}, otherwise == literal).
  readonly literals: ReadonlyArray<LiteralDecl>;
  // Lookup from literal text to its assigned token type. The parser uses
  // this to translate `.span(text)` into expectLiteral(type, value).
  readonly literalTypeByText: ReadonlyMap<string, string>;
  readonly classes: ReadonlyArray<TokenClassUsage>;
  // Closed set of distinct token type *names* the tokenizer can emit. Each
  // name gets a small integer ID; generated code compares `state.types[pos]
  // === TYPE_<NAME>` instead of `tok.type === '<name>'`. Order is stable
  // (sorted) so a re-run with the same schema produces identical output.
  readonly tokenTypeIds: ReadonlyMap<string, number>;
  readonly whitespace: WhitespacePolicy;
  readonly unknownChars: UnknownCharPolicy;
  readonly bom: BomPolicy;
  readonly unicode: UnicodeForm;
  readonly newlines: NewlinePolicy;
  readonly caseSensitive: boolean;
  // Default render target, propagated from SchemaDef.defaultTarget. The
  // generated `render(input, opts)` wrapper uses this as the fallback when
  // the caller didn't pass `{ type }`. Phase 4 will wire the same constant
  // into the public `stringify(s, opts)` wrapper once inverse derivation
  // lands.
  readonly defaultTarget?: string;
  readonly validation?: ValidationDef;
};

// --- Validation result -----------------------------------------------------

export type ValidationIssue = {
  readonly message: string;
  readonly nodeType?: string;
  readonly span?: SpanDef;
};

export class CompilerError extends Error {
  constructor(message: string, public readonly issues: ReadonlyArray<ValidationIssue> = []) {
    super(message);
    this.name = 'CompilerError';
  }
}

