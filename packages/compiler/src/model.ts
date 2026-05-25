// The InferredSchema is the intermediate representation produced by the
// inference passes and consumed by the emitter. It contains only generic
// shape — no language-specific knowledge.

import { isTemplate } from '@parser2/parser';
import type {
  ExampleDef,
  RecoveryPolicy,
  Refinement,
  RenderBody,
  SpanClass,
  SpanDef,
  SpanModifier,
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

// TODO(Phase 3): delete; transient codegen-internal data used by emit/stringify.ts until that file is rewritten.
export type StringifyTemplate = {
  readonly target: string;
  readonly parts: ReadonlyArray<string>;
  readonly slots: ReadonlyArray<StringifyTemplateSlot>;
};

// TODO(Phase 3): delete; transient codegen-internal data used by emit/stringify.ts until that file is rewritten.
export type StringifyTemplateSlot = {
  readonly kind: 'capture';
  readonly ref: string;
  // Set by infer/source-template.ts when the underlying span has .optional().
  // At emit time, the preceding separator part collapses to "" when the
  // runtime value is null/undefined. Not settable from the public `tpl` DSL;
  // author templates always have optional === undefined.
  readonly optional?: boolean;
};

// Per-(production, target) IR entry built by infer/render-targets.ts.
// `body` is whatever the schema author handed to .render(target, body) —
// either a Template (tpl-tagged literal) or a StructureValue-shaped object
// tree with $ref leaves. `inverse` is the optional template used to drive
// the reverse direction (target text → parser input) in Phase 4.
export type RenderTargetIR = {
  readonly target: string;
  readonly body: RenderBody;
  readonly inverse?: import('@parser2/parser').Template;
};

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
  // Default render target, propagated from SchemaDef.defaultTarget. The
  // generated `render(input, opts)` / `stringify(s, opts)` wrappers use this
  // as the fallback when the caller didn't pass `{ target }`. Phase 3 wires
  // this into the emitted dispatch table.
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

// --- Transient bridge: derive legacy stringify-template view from renders --
//
// Phase 3 deletes this helper along with StringifyTemplate / StringifyTemplateSlot.
// Until then, emit/stringify.ts continues to consume the legacy shape and
// pulls it through this bridge instead of reading a Production field directly.
//
// The bridge picks every render entry whose body is a Template (i.e. the
// author handed a `tpl` literal to .render), and reshapes it into
// { target, parts, slots }. Entries whose body is structured data (the
// StructureValue-tree forms today's AST) are skipped — emit/stringify.ts
// doesn't know how to render them. Phase 3's new emit pipeline handles
// both shapes uniformly.
export function derivedStringifyTemplates(
  production: Production,
): ReadonlyArray<StringifyTemplate> {
  const out: StringifyTemplate[] = [];
  for (const entry of production.renders.values()) {
    if (!isTemplate(entry.body)) continue;
    out.push({
      target: entry.target,
      parts: [...entry.body.parts],
      slots: entry.body.slots.map((s) => ({ kind: 'capture', ref: s.ref })),
    });
  }
  return out;
}
